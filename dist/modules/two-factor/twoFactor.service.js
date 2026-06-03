"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTwoFactor = exports.disableTwoFactor = exports.verifyTwoFactorLogin = exports.createTwoFactorLoginToken = exports.verifyTwoFactorSetup = exports.setupTwoFactor = void 0;
const crypto_1 = __importDefault(require("crypto"));
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../../config/db");
const schema_1 = require("../../db/schema");
const crypto_2 = require("../../utils/crypto");
const logActivity_1 = require("../../utils/logActivity");
const OTP_STEP_SECONDS = 30;
const SETUP_EXPIRY_MS = 15 * 60 * 1000;
const RECOVERY_CODES_COUNT = 10;
const getIssuer = () => process.env.TWO_FACTOR_ISSUER || "CAC CMS";
const getLoginJwtSecret = () => process.env.JWT_2FA_SECRET || process.env.JWT_SECRET || "";
otplib_1.authenticator.options = {
    window: 1,
};
const getTokenStepFromDelta = (delta) => {
    const currentStep = Math.floor(Date.now() / 1000 / OTP_STEP_SECONDS);
    return currentStep + delta;
};
const assertOtpNotReused = (lastUsedStep, step) => {
    if (lastUsedStep !== null && step <= lastUsedStep) {
        throw new Error("OTP already used");
    }
};
const generateRecoveryCodes = async (userId) => {
    const codes = Array.from({ length: RECOVERY_CODES_COUNT }).map(() => {
        return crypto_1.default.randomBytes(6).toString("hex").slice(0, 10).toUpperCase();
    });
    const hashes = await Promise.all(codes.map((code) => bcrypt_1.default.hash(code, 10)));
    await db_1.db
        .delete(schema_1.userRecoveryCodes)
        .where((0, drizzle_orm_1.eq)(schema_1.userRecoveryCodes.userId, userId));
    await db_1.db.insert(schema_1.userRecoveryCodes).values(hashes.map((hash) => ({
        userId,
        codeHash: hash,
    })));
    return codes;
};
const consumeRecoveryCode = async (userId, code) => {
    const normalizedCode = code.replace(/\s+/g, "").toUpperCase();
    const availableCodes = await db_1.db
        .select()
        .from(schema_1.userRecoveryCodes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userRecoveryCodes.userId, userId), (0, drizzle_orm_1.isNull)(schema_1.userRecoveryCodes.usedAt)));
    for (const record of availableCodes) {
        const matches = await bcrypt_1.default.compare(normalizedCode, record.codeHash);
        if (matches) {
            await db_1.db
                .update(schema_1.userRecoveryCodes)
                .set({ usedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.userRecoveryCodes.id, record.id));
            return true;
        }
    }
    return false;
};
const setupTwoFactor = async (userId) => {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
    });
    if (!user) {
        throw new Error("User not found");
    }
    if (user.twoFactorEnabled) {
        throw new Error("Two-factor authentication is already enabled");
    }
    const secret = otplib_1.authenticator.generateSecret();
    const otpauthUrl = otplib_1.authenticator.keyuri(user.email, getIssuer(), secret);
    const qrCode = await qrcode_1.default.toDataURL(otpauthUrl);
    await db_1.db
        .update(schema_1.users)
        .set({
        twoFactorTempSecret: (0, crypto_2.encryptSecret)(secret),
        twoFactorTempIssuedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    await (0, logActivity_1.logActivity)({
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
exports.setupTwoFactor = setupTwoFactor;
const verifyTwoFactorSetup = async (userId, token) => {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
    });
    if (!user || !user.twoFactorTempSecret) {
        throw new Error("No pending 2FA setup found");
    }
    if (user.twoFactorEnabled) {
        throw new Error("Two-factor authentication is already enabled");
    }
    if (!user.twoFactorTempIssuedAt ||
        Date.now() - user.twoFactorTempIssuedAt.getTime() > SETUP_EXPIRY_MS) {
        throw new Error("2FA setup expired. Please start again.");
    }
    const secret = (0, crypto_2.decryptSecret)(user.twoFactorTempSecret);
    const normalizedToken = token.replace(/\s+/g, "");
    const delta = otplib_1.authenticator.checkDelta(normalizedToken, secret);
    if (delta === null) {
        throw new Error("Invalid authentication code");
    }
    const step = getTokenStepFromDelta(delta);
    assertOtpNotReused(user.twoFactorLastUsedStep ?? null, step);
    await db_1.db
        .update(schema_1.users)
        .set({
        twoFactorEnabled: true,
        twoFactorSecret: (0, crypto_2.encryptSecret)(secret),
        twoFactorTempSecret: null,
        twoFactorTempIssuedAt: null,
        twoFactorLastUsedStep: step,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    const recoveryCodes = await generateRecoveryCodes(userId);
    await (0, logActivity_1.logActivity)({
        userId,
        action: "2FA_ENABLED",
        metadata: { recoveryCodesGenerated: recoveryCodes.length },
    });
    return {
        message: "Two-factor authentication enabled",
        recoveryCodes,
    };
};
exports.verifyTwoFactorSetup = verifyTwoFactorSetup;
const createTwoFactorLoginToken = (user) => {
    const secret = getLoginJwtSecret();
    if (!secret) {
        throw new Error("JWT secret is not configured");
    }
    return jsonwebtoken_1.default.sign({
        id: user.id,
        role: user.role,
        state: user.state,
        purpose: "2fa_login",
    }, secret, { expiresIn: "5m" });
};
exports.createTwoFactorLoginToken = createTwoFactorLoginToken;
const verifyTwoFactorLogin = async (payload) => {
    const secret = getLoginJwtSecret();
    if (!secret) {
        throw new Error("JWT secret is not configured");
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(payload.token, secret);
    }
    catch {
        throw new Error("2FA token expired or invalid");
    }
    if (!decoded?.id || decoded.purpose !== "2fa_login") {
        throw new Error("Invalid 2FA token");
    }
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, decoded.id),
    });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new Error("Two-factor authentication is not enabled");
    }
    const secretDecrypted = (0, crypto_2.decryptSecret)(user.twoFactorSecret);
    if (payload.otp) {
        const normalizedToken = payload.otp.replace(/\s+/g, "");
        const delta = otplib_1.authenticator.checkDelta(normalizedToken, secretDecrypted);
        if (delta === null) {
            throw new Error("Invalid authentication code");
        }
        const step = getTokenStepFromDelta(delta);
        assertOtpNotReused(user.twoFactorLastUsedStep ?? null, step);
        await db_1.db
            .update(schema_1.users)
            .set({ twoFactorLastUsedStep: step })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
    }
    else if (payload.recoveryCode) {
        const used = await consumeRecoveryCode(user.id, payload.recoveryCode);
        if (!used) {
            throw new Error("Invalid recovery code");
        }
    }
    else {
        throw new Error("Authentication code is required");
    }
    const sessionToken = jsonwebtoken_1.default.sign({
        id: user.id,
        role: user.role,
        state: user.state,
    }, process.env.JWT_SECRET, { expiresIn: payload.rememberDevice ? "30d" : "1d" });
    await (0, logActivity_1.logActivity)({
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
exports.verifyTwoFactorLogin = verifyTwoFactorLogin;
const disableTwoFactor = async (userId, payload) => {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
    });
    if (!user) {
        throw new Error("User not found");
    }
    const passwordMatch = await bcrypt_1.default.compare(payload.password, user.passwordHash);
    if (!passwordMatch) {
        throw new Error("Password is incorrect");
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new Error("Two-factor authentication is not enabled");
    }
    const secretDecrypted = (0, crypto_2.decryptSecret)(user.twoFactorSecret);
    if (payload.otp) {
        const normalizedToken = payload.otp.replace(/\s+/g, "");
        const delta = otplib_1.authenticator.checkDelta(normalizedToken, secretDecrypted);
        if (delta === null) {
            throw new Error("Invalid authentication code");
        }
        const step = getTokenStepFromDelta(delta);
        assertOtpNotReused(user.twoFactorLastUsedStep ?? null, step);
    }
    else if (payload.recoveryCode) {
        const used = await consumeRecoveryCode(user.id, payload.recoveryCode);
        if (!used) {
            throw new Error("Invalid recovery code");
        }
    }
    else {
        throw new Error("Authentication code is required");
    }
    await db_1.db
        .update(schema_1.users)
        .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null,
        twoFactorTempIssuedAt: null,
        twoFactorLastUsedStep: null,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
    await db_1.db
        .delete(schema_1.userRecoveryCodes)
        .where((0, drizzle_orm_1.eq)(schema_1.userRecoveryCodes.userId, user.id));
    await (0, logActivity_1.logActivity)({
        userId: user.id,
        action: "2FA_DISABLED",
    });
    return { message: "Two-factor authentication disabled" };
};
exports.disableTwoFactor = disableTwoFactor;
const resetTwoFactor = async (userId, payload) => {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
    });
    if (!user) {
        throw new Error("User not found");
    }
    const passwordMatch = await bcrypt_1.default.compare(payload.password, user.passwordHash);
    if (!passwordMatch) {
        throw new Error("Password is incorrect");
    }
    const used = await consumeRecoveryCode(user.id, payload.recoveryCode);
    if (!used) {
        throw new Error("Invalid recovery code");
    }
    await db_1.db
        .update(schema_1.users)
        .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null,
        twoFactorTempIssuedAt: null,
        twoFactorLastUsedStep: null,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
    await db_1.db
        .delete(schema_1.userRecoveryCodes)
        .where((0, drizzle_orm_1.eq)(schema_1.userRecoveryCodes.userId, user.id));
    await (0, logActivity_1.logActivity)({
        userId: user.id,
        action: "2FA_RESET",
    });
    return { message: "Two-factor authentication reset. Please set up again." };
};
exports.resetTwoFactor = resetTwoFactor;
