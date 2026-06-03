"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPassword = exports.deleteUser = exports.bootstrapSuperAdmin = exports.getUserById = exports.getAllUsers = exports.getUserAssignedStates = exports.createUser = exports.loginUser = void 0;
const db_1 = require("../../config/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const twoFactor_service_1 = require("../two-factor/twoFactor.service");
const logActivity_1 = require("../../utils/logActivity");
const loginUser = async (email, password) => {
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
    });
    if (!user)
        throw new Error("Invalid credentials");
    const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!isMatch)
        throw new Error("Invalid credentials");
    if (user.twoFactorEnabled) {
        if (!user.twoFactorSecret) {
            throw new Error("Two-factor authentication is not configured");
        }
        const twoFactorToken = (0, twoFactor_service_1.createTwoFactorLoginToken)({
            id: user.id,
            role: user.role,
            state: user.state,
        });
        await (0, logActivity_1.logActivity)({
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
            twoFactorEnabled: user.twoFactorEnabled,
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
   GET ASSIGNED STATES
========================= */
const getUserAssignedStates = async (userId) => {
    const states = await db_1.db
        .select({ state: schema_1.enforcementHeadStates.state })
        .from(schema_1.enforcementHeadStates)
        .where((0, drizzle_orm_1.eq)(schema_1.enforcementHeadStates.enforcementHeadId, userId));
    return states.map((s) => s.state);
};
exports.getUserAssignedStates = getUserAssignedStates;
/* =========================
   GET USERS
========================= */
const getAllUsers = async (currentUser) => {
    if (currentUser.role === "super_admin" ||
        currentUser.role === "enforcement_head") {
        const allUsers = await db_1.db
            .select({
            id: schema_1.users.id,
            fullName: schema_1.users.fullName,
            email: schema_1.users.email,
            role: schema_1.users.role,
            state: schema_1.users.state,
            isActive: schema_1.users.isActive,
            twoFactorEnabled: schema_1.users.twoFactorEnabled,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users);
        // Enrich enforcement heads with their assigned states
        const enrichedUsers = await Promise.all(allUsers.map(async (user) => {
            if (user.role === "enforcement_head") {
                const assignedStates = await (0, exports.getUserAssignedStates)(user.id);
                return { ...user, assignedStates };
            }
            return { ...user, assignedStates: user.state ? [user.state] : [] };
        }));
        return enrichedUsers;
    }
    if (currentUser.role === "state_controller") {
        const allUsers = await db_1.db
            .select({
            id: schema_1.users.id,
            fullName: schema_1.users.fullName,
            email: schema_1.users.email,
            role: schema_1.users.role,
            state: schema_1.users.state,
            isActive: schema_1.users.isActive,
            twoFactorEnabled: schema_1.users.twoFactorEnabled,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.state, currentUser.state));
        const enrichedUsers = await Promise.all(allUsers.map(async (user) => {
            if (user.role === "enforcement_head") {
                const assignedStates = await (0, exports.getUserAssignedStates)(user.id);
                return { ...user, assignedStates };
            }
            return { ...user, assignedStates: user.state ? [user.state] : [] };
        }));
        return enrichedUsers;
    }
    throw new Error("Unauthorized");
};
exports.getAllUsers = getAllUsers;
/* =========================
   GET USER BY ID
========================= */
const getUserById = async (currentUser, userId) => {
    if (!["super_admin", "enforcement_head", "state_controller"].includes(currentUser.role)) {
        throw new Error("Unauthorized");
    }
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
    });
    if (!user) {
        throw new Error("User not found");
    }
    // State controllers can only view users in their state
    if (currentUser.role === "state_controller" &&
        user.state !== currentUser.state) {
        throw new Error("Unauthorized");
    }
    let assignedStates = [];
    if (user.role === "enforcement_head") {
        assignedStates = await (0, exports.getUserAssignedStates)(user.id);
    }
    else if (user.state) {
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
exports.getUserById = getUserById;
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
const updateUserPassword = async (currentUser, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
        throw new Error("Current password and new password are required");
    }
    if (currentPassword === newPassword) {
        throw new Error("New password must be different from current password");
    }
    const user = await db_1.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.id, currentUser.id),
    });
    if (!user) {
        throw new Error("User not found");
    }
    const isMatch = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
        throw new Error("Current password is incorrect");
    }
    const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
    await db_1.db
        .update(schema_1.users)
        .set({ passwordHash: hashedPassword })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
    return { message: "Password updated successfully" };
};
exports.updateUserPassword = updateUserPassword;
