import { db } from "../../config/db";
import { users, enforcementHeadStates } from "../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createTwoFactorLoginToken } from "../two-factor/twoFactor.service";
import { logActivity } from "../../utils/logActivity";

export const loginUser = async (email: string, password: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");

  if (user.twoFactorEnabled) {
    if (!user.twoFactorSecret) {
      throw new Error("Two-factor authentication is not configured");
    }
    const twoFactorToken = createTwoFactorLoginToken({
      id: user.id,
      role: user.role,
      state: user.state,
    });

    await logActivity({
      userId: user.id,
      action: "2FA_LOGIN_CHALLENGE",
    });

    return {
      status: "2FA_REQUIRED",
      twoFactorToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        state: user.state,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      state: user.state,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" },
  );

  return {
    token,
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

export const createUser = async (currentUser: any, data: any) => {
  if (!["super_admin", "enforcement_head"].includes(currentUser.role)) {
    throw new Error("Unauthorized");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  if (data.role === "state_controller") {
    const existing = await db.query.users.findFirst({
      where: eq(users.state, data.state),
    });

    if (existing && existing.role === "state_controller") {
      throw new Error("State controller already exists for this state");
    }
  }

  if (data.role === "officer" && !data.state) {
    throw new Error("Officer must belong to a state");
  }

  if (data.role === "enforcement_head") {
    if (!data.states || data.states.length === 0) {
      throw new Error("Enforcement head must have assigned states");
    }
  }

  const created = await db
    .insert(users)
    .values({
      fullName: data.fullName,
      email: data.email,
      passwordHash: hashedPassword,
      role: data.role,
      state: data.state ?? null,
    })
    .returning();

  if (data.role === "enforcement_head") {
    const headId = created[0].id;

    for (const state of data.states) {
      const existing = await db.query.enforcementHeadStates.findFirst({
        where: eq(enforcementHeadStates.state, state),
      });

      if (existing) {
        throw new Error(
          `State ${state} already assigned to another enforcement head`,
        );
      }

      await db.insert(enforcementHeadStates).values({
        enforcementHeadId: headId,
        state,
      });
    }
  }

  return created[0];
};

/* =========================
   GET ASSIGNED STATES
========================= */

export const getUserAssignedStates = async (userId: number) => {
  const states = await db
    .select({ state: enforcementHeadStates.state })
    .from(enforcementHeadStates)
    .where(eq(enforcementHeadStates.enforcementHeadId, userId));

  return states.map((s) => s.state);
};

/* =========================
   GET USERS
========================= */

export const getAllUsers = async (currentUser: any) => {
  if (
    currentUser.role === "super_admin" ||
    currentUser.role === "enforcement_head"
  ) {
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        state: users.state,
        isActive: users.isActive,
        twoFactorEnabled: users.twoFactorEnabled,
        createdAt: users.createdAt,
      })
      .from(users);

    // Enrich enforcement heads with their assigned states
    const enrichedUsers = await Promise.all(
      allUsers.map(async (user) => {
        if (user.role === "enforcement_head") {
          const assignedStates = await getUserAssignedStates(user.id);
          return { ...user, assignedStates };
        }
        return { ...user, assignedStates: user.state ? [user.state] : [] };
      }),
    );

    return enrichedUsers;
  }

  if (currentUser.role === "state_controller") {
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        state: users.state,
        isActive: users.isActive,
        twoFactorEnabled: users.twoFactorEnabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.state, currentUser.state));

    const enrichedUsers = await Promise.all(
      allUsers.map(async (user) => {
        if (user.role === "enforcement_head") {
          const assignedStates = await getUserAssignedStates(user.id);
          return { ...user, assignedStates };
        }
        return { ...user, assignedStates: user.state ? [user.state] : [] };
      }),
    );

    return enrichedUsers;
  }

  throw new Error("Unauthorized");
};

/* =========================
   GET USER BY ID
========================= */

export const getUserById = async (currentUser: any, userId: number) => {
  if (
    !["super_admin", "enforcement_head", "state_controller"].includes(
      currentUser.role,
    )
  ) {
    throw new Error("Unauthorized");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // State controllers can only view users in their state
  if (
    currentUser.role === "state_controller" &&
    user.state !== currentUser.state
  ) {
    throw new Error("Unauthorized");
  }

  let assignedStates: string[] = [];

  if (user.role === "enforcement_head") {
    assignedStates = await getUserAssignedStates(user.id);
  } else if (user.state) {
    assignedStates = [user.state];
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    state: user.state,
    isActive: user.isActive,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    assignedStates,
  };
};

/* =========================
   BOOTSTRAP ADMIN
========================= */

export const bootstrapSuperAdmin = async (data: any) => {
  const existing = await db.query.users.findFirst({
    where: eq(users.role, "super_admin"),
  });

  if (existing) {
    throw new Error("Super admin already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  await db.insert(users).values({
    fullName: data.fullName,
    email: data.email,
    passwordHash: hashedPassword,
    role: "super_admin",
    state: null,
  });

  return { message: "Super admin created successfully" };
};

/* =========================
   DELETE USER
========================= */

export const deleteUser = async (currentUser: any, userId: number) => {
  if (!["super_admin", "enforcement_head"].includes(currentUser.role)) {
    throw new Error("Unauthorized");
  }

  if (currentUser.id === userId) {
    throw new Error("You cannot delete yourself");
  }

  await db.delete(users).where(eq(users.id, userId));

  return { message: "User deleted successfully" };
};

export const updateUserPassword = async (
  currentUser: any,
  currentPassword: string,
  newPassword: string,
) => {
  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from current password");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, currentUser.id),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({ passwordHash: hashedPassword })
    .where(eq(users.id, user.id));

  return { message: "Password updated successfully" };
};
