import { db } from "@/config/db";
import { users, enforcementHeadStates } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginUser = async (email: string, password: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid credentials");

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
   GET USERS
========================= */

export const getAllUsers = async (currentUser: any) => {
  if (
    currentUser.role === "super_admin" ||
    currentUser.role === "enforcement_head"
  ) {
    return await db.select().from(users);
  }

  if (currentUser.role === "state_controller") {
    return await db
      .select()
      .from(users)
      .where(eq(users.state, currentUser.state));
  }

  throw new Error("Unauthorized");
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
