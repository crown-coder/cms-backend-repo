import { db } from "../../config/db";
import { sql } from "drizzle-orm";

/* =========================
   Dashboard Summary (Role Aware)
========================= */

export const getSummary = async (user: any) => {
  let whereClause = sql``;

  /* -------------------------
     Apply State Filtering
  ------------------------- */
  if (user.role === "state_controller" || user.role === "officer") {
    if (!user.state) {
      throw new Error("User is not assigned to a state");
    }

    whereClause = sql`WHERE state = ${user.state}`;
  }

  /* -------------------------
     Main Totals
  ------------------------- */
  const totals = await db.execute(sql`
    SELECT
      COUNT(*) AS total_cases,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_cases,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_cases,
      COALESCE(SUM(total_penalty), 0) AS total_penalty,
      COALESCE(SUM(total_paid), 0) AS total_paid,
      COALESCE(SUM(penalty_reduction), 0) AS total_waived
    FROM cases
    ${whereClause}
  `);

  /* -------------------------
     Cases by State
     (Only for national roles)
  ------------------------- */
  let byState: any[] = [];

  if (user.role === "super_admin" || user.role === "enforcement_head") {
    const result = await db.execute(sql`
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
    totalWaived: summary.total_waived,
    outstandingBalance:
      Number(summary.total_penalty) -
      (Number(summary.total_paid) + Number(summary.total_waived)),
    casesByState: byState,
  };
};
