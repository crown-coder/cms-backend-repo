"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = void 0;
const db_1 = require("../../config/db");
const drizzle_orm_1 = require("drizzle-orm");
/* =========================
   Dashboard Summary (Role Aware)
========================= */
const getSummary = async (user) => {
    let whereClause = (0, drizzle_orm_1.sql) ``;
    /* -------------------------
       Apply State Filtering
    ------------------------- */
    if (user.role === "state_controller" || user.role === "officer") {
        if (!user.state) {
            throw new Error("User is not assigned to a state");
        }
        whereClause = (0, drizzle_orm_1.sql) `WHERE state = ${user.state}`;
    }
    /* -------------------------
       Main Totals
    ------------------------- */
    const totals = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      COUNT(*) AS total_cases,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_cases,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_cases,
      COALESCE(SUM(total_penalty), 0) AS total_penalty,
      COALESCE(SUM(total_paid), 0) AS total_paid
    FROM cases
    ${whereClause}
  `);
    /* -------------------------
       Cases by State
       (Only for national roles)
    ------------------------- */
    let byState = [];
    if (user.role === "super_admin" || user.role === "enforcement_head") {
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT state, COUNT(*) AS total
      FROM cases
      GROUP BY state
      ORDER BY total DESC
    `);
        byState = result.rows;
    }
    const summary = totals.rows[0];
    return {
        totalCases: Number(summary.total_cases),
        pendingCases: Number(summary.pending_cases),
        resolvedCases: Number(summary.resolved_cases),
        totalPenalty: summary.total_penalty,
        totalPaid: summary.total_paid,
        outstandingBalance: Number(summary.total_penalty) - Number(summary.total_paid),
        casesByState: byState,
    };
};
exports.getSummary = getSummary;
