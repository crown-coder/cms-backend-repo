"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.bootstrapSuperAdmin = exports.getAllUsers = exports.createUser = exports.loginUser = void 0;
const db_1 = require("../../config/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const loginUser = async (email, password) => {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
    });
    if (!user)
        throw new Error("Invalid credentials");
    const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!isMatch)
        throw new Error("Invalid credentials");
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        role: user.role,
        state: user.state,
    }, process.env.JWT_SECRET, { expiresIn: "1d" });
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
exports.loginUser = loginUser;
const createUser = async (currentUser, data) => {
    if (!["super_admin", "enforcement_head"].includes(currentUser.role)) {
        throw new Error("Unauthorized");
    }
    const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
    if (data.role === "state_controller") {
        const existing = await db_1.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.state, data.state),
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
    const created = await db_1.db
        .insert(schema_1.users)
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
            const existing = await db_1.db.query.enforcementHeadStates.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.enforcementHeadStates.state, state),
            });
            if (existing) {
                throw new Error(`State ${state} already assigned to another enforcement head`);
            }
            await db_1.db.insert(schema_1.enforcementHeadStates).values({
                enforcementHeadId: headId,
                state,
            });
        }
    }
    return created[0];
};
exports.createUser = createUser;
/* =========================
   GET USERS
========================= */
const getAllUsers = async (currentUser) => {
    if (currentUser.role === "super_admin" ||
        currentUser.role === "enforcement_head") {
        return await db_1.db.select().from(schema_1.users);
    }
    if (currentUser.role === "state_controller") {
        return await db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.state, currentUser.state));
    }
    throw new Error("Unauthorized");
};
exports.getAllUsers = getAllUsers;
/* =========================
   BOOTSTRAP ADMIN
========================= */
const bootstrapSuperAdmin = async (data) => {
    const existing = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.role, "super_admin"),
    });
    if (existing) {
        throw new Error("Super admin already exists");
    }
    const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
    await db_1.db.insert(schema_1.users).values({
        fullName: data.fullName,
        email: data.email,
        passwordHash: hashedPassword,
        role: "super_admin",
        state: null,
    });
    return { message: "Super admin created successfully" };
};
exports.bootstrapSuperAdmin = bootstrapSuperAdmin;
/* =========================
   DELETE USER
========================= */
const deleteUser = async (currentUser, userId) => {
    if (!["super_admin", "enforcement_head"].includes(currentUser.role)) {
        throw new Error("Unauthorized");
    }
    if (currentUser.id === userId) {
        throw new Error("You cannot delete yourself");
    }
    await db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    return { message: "User deleted successfully" };
};
exports.deleteUser = deleteUser;
