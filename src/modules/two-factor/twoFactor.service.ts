import crypto from "crypto";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../config/db";
import { users, userRecoveryCodes } from "../../db/schema";
import { encryptSecret, decryptSecret } from "../../utils/crypto";
import { logActivity } from "../../utils/logActivity";

const OTP_STEP_SECONDS = 30;
const SETUP_EXPIRY_MS = 15 * 60 * 1000;
const RECOVERY_CODES_COUNT = 10;

const getIssuer = () => process.env.TWO_FACTOR_ISSUER || "CAC CMS";
const getLoginJwtSecret = () =>
  process.env.JWT_2FA_SECRET || process.env.JWT_SECRET || "";

authenticator.options = {
  window: 1,
};

const getTokenStepFromDelta = (delta: number) => {
  const currentStep = Math.floor(Date.now() / 1000 / OTP_STEP_SECONDS);
  return currentStep + delta;
};

const assertOtpNotReused = (lastUsedStep: number | null, step: number) => {
  if (lastUsedStep !== null && step <= lastUsedStep) {
    throw new Error("OTP already used");
  }
};

const generateRecoveryCodes = async (userId: number) => {
  const codes = Array.from({ length: RECOVERY_CODES_COUNT }).map(() => {
    return crypto.randomBytes(6).toString("hex").slice(0, 10).toUpperCase();
  });

  const hashes = await Promise.all(codes.map((code) => bcrypt.hash(code, 10)));

  await db
    .delete(userRecoveryCodes)
    .where(eq(userRecoveryCodes.userId, userId));

  await db.insert(userRecoveryCodes).values(
    hashes.map((hash) => ({
      userId,
      codeHash: hash,
    })),
  );

  return codes;
};

const consumeRecoveryCode = async (userId: number, code: string) => {
  const normalizedCode = code.replace(/\s+/g, "").toUpperCase();
  const availableCodes = await db
    .select()
    .from(userRecoveryCodes)
    .where(
      and(
        eq(userRecoveryCodes.userId, userId),
        isNull(userRecoveryCodes.usedAt),
      ),
    );

  for (const record of availableCodes) {
    const matches = await bcrypt.compare(normalizedCode, record.codeHash);
    if (matches) {
      await db
        .update(userRecoveryCodes)
        .set({ usedAt: new Date() })
        .where(eq(userRecoveryCodes.id, record.id));
      return true;
    }
  }

  return false;
};

export const setupTwoFactor = async (userId: number) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.twoFactorEnabled) {
    throw new Error("Two-factor authentication is already enabled");
  }

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, getIssuer(), secret);
  const qrCode = await qrcode.toDataURL(otpauthUrl);

  await db
    .update(users)
    .set({
      twoFactorTempSecret: encryptSecret(secret),
      twoFactorTempIssuedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logActivity({
    userId,
    action: "2FA_SETUP_INITIATED",
    metadata: { issuer: getIssuer() },
  });

  return {
    qrCode,
    manualKey: secret,
    otpauthUrl,
  };
};

export const verifyTwoFactorSetup = async (userId: number, token: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.twoFactorTempSecret) {
    throw new Error("No pending 2FA setup found");
  }

  if (user.twoFactorEnabled) {
    throw new Error("Two-factor authentication is already enabled");
  }

  if (
    !user.twoFactorTempIssuedAt ||
    Date.now() - user.twoFactorTempIssuedAt.getTime() > SETUP_EXPIRY_MS
  ) {
    throw new Error("2FA setup expired. Please start again.");
  }

  const secret = decryptSecret(user.twoFactorTempSecret);
  const normalizedToken = token.replace(/\s+/g, "");
  const delta = authenticator.checkDelta(normalizedToken, secret);
  if (delta === null) {
    throw new Error("Invalid authentication code");
  }

  const step = getTokenStepFromDelta(delta);
  assertOtpNotReused(user.twoFactorLastUsedStep ?? null, step);

  await db
    .update(users)
    .set({
      twoFactorEnabled: true,
      twoFactorSecret: encryptSecret(secret),
      twoFactorTempSecret: null,
      twoFactorTempIssuedAt: null,
      twoFactorLastUsedStep: step,
    })
    .where(eq(users.id, userId));

  const recoveryCodes = await generateRecoveryCodes(userId);

  await logActivity({
    userId,
    action: "2FA_ENABLED",
    metadata: { recoveryCodesGenerated: recoveryCodes.length },
  });

  return {
    message: "Two-factor authentication enabled",
    recoveryCodes,
  };
};

export const createTwoFactorLoginToken = (user: {
  id: number;
  role: string;
  state?: string | null;
}) => {
  const secret = getLoginJwtSecret();
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      state: user.state,
      purpose: "2fa_login",
    },
    secret,
    { expiresIn: "5m" },
  );
};

export const verifyTwoFactorLogin = async (payload: {
  token: string;
  otp?: string;
  recoveryCode?: string;
  rememberDevice?: boolean;
}) => {
  const secret = getLoginJwtSecret();
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  let decoded: any;
  try {
    decoded = jwt.verify(payload.token, secret);
  } catch {
    throw new Error("2FA token expired or invalid");
  }

  if (!decoded?.id || decoded.purpose !== "2fa_login") {
    throw new Error("Invalid 2FA token");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, decoded.id),
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("Two-factor authentication is not enabled");
  }

  const secretDecrypted = decryptSecret(user.twoFactorSecret);

  if (payload.otp) {
    const normalizedToken = payload.otp.replace(/\s+/g, "");
    const delta = authenticator.checkDelta(normalizedToken, secretDecrypted);
    if (delta === null) {
      throw new Error("Invalid authentication code");
    }

    const step = getTokenStepFromDelta(delta);
    assertOtpNotReused(user.twoFactorLastUsedStep ?? null, step);

    await db
      .update(users)
      .set({ twoFactorLastUsedStep: step })
      .where(eq(users.id, user.id));
  } else if (payload.recoveryCode) {
    const used = await consumeRecoveryCode(user.id, payload.recoveryCode);
    if (!used) {
      throw new Error("Invalid recovery code");
    }
  } else {
    throw new Error("Authentication code is required");
  }

  const sessionToken = jwt.sign(
    {
      id: user.id,
      role: user.role,
      state: user.state,
    },
    process.env.JWT_SECRET!,
    { expiresIn: payload.rememberDevice ? "30d" : "1d" },
  );

  await logActivity({
    userId: user.id,
    action: "2FA_LOGIN_SUCCESS",
  });

  return {
    token: sessionToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      state: user.state,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
};

export const disableTwoFactor = async (
  userId: number,
  payload: {
    password: string;
    otp?: string;
    recoveryCode?: string;
  },
) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordMatch = await bcrypt.compare(
    payload.password,
    user.passwordHash,
  );
  if (!passwordMatch) {
    throw new Error("Password is incorrect");
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("Two-factor authentication is not enabled");
  }

  const secretDecrypted = decryptSecret(user.twoFactorSecret);

  if (payload.otp) {
    const normalizedToken = payload.otp.replace(/\s+/g, "");
    const delta = authenticator.checkDelta(normalizedToken, secretDecrypted);
    if (delta === null) {
      throw new Error("Invalid authentication code");
    }

    const step = getTokenStepFromDelta(delta);
    assertOtpNotReused(user.twoFactorLastUsedStep ?? null, step);
  } else if (payload.recoveryCode) {
    const used = await consumeRecoveryCode(user.id, payload.recoveryCode);
    if (!used) {
      throw new Error("Invalid recovery code");
    }
  } else {
    throw new Error("Authentication code is required");
  }

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorTempIssuedAt: null,
      twoFactorLastUsedStep: null,
    })
    .where(eq(users.id, user.id));

  await db
    .delete(userRecoveryCodes)
    .where(eq(userRecoveryCodes.userId, user.id));

  await logActivity({
    userId: user.id,
    action: "2FA_DISABLED",
  });

  return { message: "Two-factor authentication disabled" };
};

export const resetTwoFactor = async (
  userId: number,
  payload: {
    password: string;
    recoveryCode: string;
  },
) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordMatch = await bcrypt.compare(
    payload.password,
    user.passwordHash,
  );
  if (!passwordMatch) {
    throw new Error("Password is incorrect");
  }

  const used = await consumeRecoveryCode(user.id, payload.recoveryCode);
  if (!used) {
    throw new Error("Invalid recovery code");
  }

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorTempIssuedAt: null,
      twoFactorLastUsedStep: null,
    })
    .where(eq(users.id, user.id));

  await db
    .delete(userRecoveryCodes)
    .where(eq(userRecoveryCodes.userId, user.id));

  await logActivity({
    userId: user.id,
    action: "2FA_RESET",
  });

  return { message: "Two-factor authentication reset. Please set up again." };
};
