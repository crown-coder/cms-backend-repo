"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityLogs = exports.complianceSections = exports.payments = exports.complianceItems = exports.cases = exports.enforcementHeadStates = exports.users = exports.stateEnum = exports.complianceStatusEnum = exports.caseResolutionTypeEnum = exports.caseStatusEnum = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
/* =========================
   ENUMS
========================= */
exports.roleEnum = (0, pg_core_1.pgEnum)("role", [
    "super_admin",
    "enforcement_head",
    "state_controller",
    "officer",
]);
exports.caseStatusEnum = (0, pg_core_1.pgEnum)("case_status", [
    "pending",
    "in_progress",
    "escalated",
    "resolved",
    "suspended",
]);
exports.caseResolutionTypeEnum = (0, pg_core_1.pgEnum)("case_resolution_type", [
    "payment_complete",
    "penalty_waived",
    "suspended",
]);
exports.complianceStatusEnum = (0, pg_core_1.pgEnum)("compliance_status", [
    "compliant",
    "non_compliant",
]);
exports.stateEnum = (0, pg_core_1.pgEnum)("state", [
    "Abia",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara",
    "FCT",
]);
/* =========================
   USERS
========================= */
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    role: (0, exports.roleEnum)("role").notNull(),
    // used by state_controller & officer
    state: (0, exports.stateEnum)("state"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
/* =========================
   ENFORCEMENT HEAD STATES
========================= */
exports.enforcementHeadStates = (0, pg_core_1.pgTable)("enforcement_head_states", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    enforcementHeadId: (0, pg_core_1.integer)("enforcement_head_id")
        .references(() => exports.users.id)
        .notNull(),
    state: (0, exports.stateEnum)("state").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
/* =========================
   CASES
========================= */
exports.cases = (0, pg_core_1.pgTable)("cases", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    companyName: (0, pg_core_1.text)("company_name").notNull(),
    rcNumber: (0, pg_core_1.text)("rc_number"),
    address: (0, pg_core_1.text)("address"),
    inspectionDate: (0, pg_core_1.timestamp)("inspection_date").notNull(),
    createdBy: (0, pg_core_1.integer)("created_by")
        .references(() => exports.users.id)
        .notNull(),
    state: (0, exports.stateEnum)("state").notNull(),
    status: (0, exports.caseStatusEnum)("status").default("pending"),
    resolutionType: (0, exports.caseResolutionTypeEnum)("resolution_type"),
    penaltyReduction: (0, pg_core_1.numeric)("penalty_reduction").default("0"),
    suspensionReason: (0, pg_core_1.text)("suspension_reason"),
    suspendedUntil: (0, pg_core_1.timestamp)("suspended_until"),
    totalPenalty: (0, pg_core_1.numeric)("total_penalty").default("0"),
    totalPaid: (0, pg_core_1.numeric)("total_paid").default("0"),
    resolvedBy: (0, pg_core_1.integer)("resolved_by").references(() => exports.users.id),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    resolutionRemark: (0, pg_core_1.text)("resolution_remark"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
/* =========================
   COMPLIANCE ITEMS
========================= */
exports.complianceItems = (0, pg_core_1.pgTable)("compliance_items", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    caseId: (0, pg_core_1.integer)("case_id")
        .references(() => exports.cases.id)
        .notNull(),
    sectionId: (0, pg_core_1.integer)("section_id")
        .references(() => exports.complianceSections.id)
        .notNull(),
    complianceStatus: (0, exports.complianceStatusEnum)("compliance_status").notNull(),
    periodOfNonCompliance: (0, pg_core_1.text)("period_non_compliance"),
    officersPenalised: (0, pg_core_1.integer)("officers_penalised"),
    penaltyComputation: (0, pg_core_1.text)("penalty_computation"),
    totalPayable: (0, pg_core_1.numeric)("total_payable").default("0"),
    amountPaid: (0, pg_core_1.numeric)("amount_paid").default("0"),
    notes: (0, pg_core_1.text)("notes"),
});
/* =========================
   PAYMENTS
========================= */
exports.payments = (0, pg_core_1.pgTable)("payments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    caseId: (0, pg_core_1.integer)("case_id")
        .references(() => exports.cases.id)
        .notNull(),
    amount: (0, pg_core_1.numeric)("amount").notNull(),
    paymentDate: (0, pg_core_1.timestamp)("payment_date").defaultNow(),
});
/* =========================
   COMPLIANCE SECTIONS
========================= */
exports.complianceSections = (0, pg_core_1.pgTable)("compliance_sections", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    code: (0, pg_core_1.text)("code").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
/* =========================
   ACTIVITY LOG
========================= */
exports.activityLogs = (0, pg_core_1.pgTable)("activity_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id")
        .references(() => exports.users.id)
        .notNull(),
    caseId: (0, pg_core_1.integer)("case_id").references(() => exports.cases.id),
    action: (0, pg_core_1.text)("action").notNull(),
    metadata: (0, pg_core_1.text)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
