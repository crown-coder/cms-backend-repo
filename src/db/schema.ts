import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

/* =========================
   ENUMS
========================= */

export const roleEnum = pgEnum("role", [
  "super_admin",
  "enforcement_head",
  "state_controller",
  "officer",
]);

export const caseStatusEnum = pgEnum("case_status", [
  "pending",
  "in_progress",
  "escalated",
  "resolved",
]);

export const complianceStatusEnum = pgEnum("compliance_status", [
  "compliant",
  "non_compliant",
]);

export const stateEnum = pgEnum("state", [
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),

  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),

  role: roleEnum("role").notNull(),

  // used by state_controller & officer
  state: stateEnum("state"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   ENFORCEMENT HEAD STATES
========================= */

export const enforcementHeadStates = pgTable("enforcement_head_states", {
  id: serial("id").primaryKey(),

  enforcementHeadId: integer("enforcement_head_id")
    .references(() => users.id)
    .notNull(),

  state: stateEnum("state").notNull().unique(),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   CASES
========================= */

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),

  companyName: text("company_name").notNull(),
  rcNumber: text("rc_number"),
  address: text("address"),

  inspectionDate: timestamp("inspection_date").notNull(),

  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),

  state: stateEnum("state").notNull(),

  status: caseStatusEnum("status").default("pending"),

  totalPenalty: numeric("total_penalty").default("0"),
  totalPaid: numeric("total_paid").default("0"),

  resolvedBy: integer("resolved_by").references(() => users.id),

  resolvedAt: timestamp("resolved_at"),

  resolutionRemark: text("resolution_remark"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   COMPLIANCE ITEMS
========================= */

export const complianceItems = pgTable("compliance_items", {
  id: serial("id").primaryKey(),

  caseId: integer("case_id")
    .references(() => cases.id)
    .notNull(),

  sectionId: integer("section_id")
    .references(() => complianceSections.id)
    .notNull(),

  complianceStatus: complianceStatusEnum("compliance_status").notNull(),

  periodOfNonCompliance: text("period_non_compliance"),

  officersPenalised: integer("officers_penalised"),

  penaltyComputation: text("penalty_computation"),

  totalPayable: numeric("total_payable").default("0"),
  amountPaid: numeric("amount_paid").default("0"),

  notes: text("notes"),
});

/* =========================
   PAYMENTS
========================= */

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),

  caseId: integer("case_id")
    .references(() => cases.id)
    .notNull(),

  amount: numeric("amount").notNull(),

  paymentDate: timestamp("payment_date").defaultNow(),
});

/* =========================
   COMPLIANCE SECTIONS
========================= */

export const complianceSections = pgTable("compliance_sections", {
  id: serial("id").primaryKey(),

  code: text("code").notNull(),
  title: text("title").notNull(),

  description: text("description"),

  createdAt: timestamp("created_at").defaultNow(),
});

/* =========================
   ACTIVITY LOG
========================= */

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),

  caseId: integer("case_id").references(() => cases.id),

  action: text("action").notNull(),

  metadata: text("metadata"),

  createdAt: timestamp("created_at").defaultNow(),
});
