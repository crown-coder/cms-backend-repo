import { db } from "../../config/db";
import { complianceItems, cases, complianceSections } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { logActivity } from "../../utils/logActivity";

/* =========================
   Add Compliance Item
========================= */

export const addComplianceItem = async (
  user: any,
  caseId: number,
  data: any,
) => {
  /* -------------------------
     1️⃣ Validate section exists
  ------------------------- */
  const section = await db
    .select()
    .from(complianceSections)
    .where(eq(complianceSections.id, data.sectionId))
    .limit(1);

  if (!section.length) {
    throw new Error("Invalid compliance section");
  }

  /* -------------------------
     2️⃣ Prevent duplicate section per case
  ------------------------- */
  const existing = await db
    .select()
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.caseId, caseId),
        eq(complianceItems.sectionId, data.sectionId),
      ),
    )
    .limit(1);

  if (existing.length) {
    throw new Error("This section already exists for this case");
  }

  /* -------------------------
     3️⃣ Insert compliance item
  ------------------------- */
  const newItem = await db
    .insert(complianceItems)
    .values({
      caseId,
      sectionId: data.sectionId,
      complianceStatus: data.complianceStatus,
      periodOfNonCompliance: data.periodOfNonCompliance,
      officersPenalised: data.officersPenalised,
      penaltyComputation: data.penaltyComputation,
      totalPayable: data.totalPayable ?? "0",
      amountPaid: data.amountPaid ?? "0",
      notes: data.notes,
    })
    .returning();

  /* -------------------------
     4️⃣ Recalculate totals
  ------------------------- */
  await recalculateCaseTotals(caseId);

  /* -------------------------
     5️⃣ Log activity
  ------------------------- */
  await logActivity({
    userId: user.id,
    caseId,
    action: "Compliance item added",
    metadata: {
      sectionId: data.sectionId,
    },
  });

  return newItem[0];
};

/* =========================
   Recalculate Totals
========================= */

const recalculateCaseTotals = async (caseId: number) => {
  const items = await db
    .select()
    .from(complianceItems)
    .where(eq(complianceItems.caseId, caseId));

  let totalPenalty = 0;
  let totalPaid = 0;

  for (const item of items) {
    totalPenalty += Number(item.totalPayable ?? 0);
    totalPaid += Number(item.amountPaid ?? 0);
  }

  await db
    .update(cases)
    .set({
      totalPenalty: totalPenalty.toString(),
      totalPaid: totalPaid.toString(),
    })
    .where(eq(cases.id, caseId));
};
