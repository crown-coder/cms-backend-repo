import { db } from "../../config/db";
import {
  cases,
  complianceSections,
  complianceItems,
  enforcementHeadStates,
} from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { logActivity } from "../../utils/logActivity";

export const createCase = async (user: any, data: any) => {
  const newCase = await db
    .insert(cases)
    .values({
      companyName: data.companyName,
      rcNumber: data.rcNumber,
      address: data.address,
      inspectionDate: new Date(data.inspectionDate),
      createdBy: user.id,
      state: user.state,
      status: "pending",
    })
    .returning();

  await logActivity({
    userId: user.id,
    caseId: newCase[0].id,
    action: "Case created",
  });

  return newCase[0];
};

export const getCases = async (user: any) => {
  if (user.role === "super_admin") {
    return await db.select().from(cases);
  }

  if (user.role === "enforcement_head") {
    const states = await db
      .select()
      .from(enforcementHeadStates)
      .where(eq(enforcementHeadStates.enforcementHeadId, user.id));

    const stateList = states.map((s) => s.state);

    return await db.select().from(cases).where(inArray(cases.state, stateList));
  }

  if (user.role === "state_controller" || user.role === "officer") {
    if (!user.state) {
      throw new Error("User is not assigned to a state");
    }

    return await db.select().from(cases).where(eq(cases.state, user.state));
  }

  throw new Error("Unauthorized");
};

export const resolveCase = async (
  caseId: number,
  user: any,
  remark: string,
) => {
  if (!["super_admin", "enforcement_head"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  const updated = await db
    .update(cases)
    .set({
      status: "resolved",
      resolvedBy: user.id,
      resolvedAt: new Date(),
      resolutionRemark: remark,
    })
    .where(eq(cases.id, caseId))
    .returning();

  if (!updated.length) {
    throw new Error("Case not found");
  }

  await logActivity({
    userId: user.id,
    caseId,
    action: "Case resolved",
    metadata: { remark },
  });

  return updated[0];
};

/* =========================
   GET CASE BY ID
========================= */

export const getCaseById = async (user: any, caseId: number) => {
  const caseData = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!caseData.length) {
    throw new Error("Case not found");
  }

  const singleCase = caseData[0];

  if (user.role === "state_controller" || user.role === "officer") {
    if (singleCase.state !== user.state) {
      throw new Error("Unauthorized to view this case");
    }
  }

  if (user.role === "enforcement_head") {
    const states = await db
      .select()
      .from(enforcementHeadStates)
      .where(eq(enforcementHeadStates.enforcementHeadId, user.id));

    const stateList = states.map((s) => s.state);

    if (!stateList.includes(singleCase.state)) {
      throw new Error("Unauthorized to view this case");
    }
  }

  const items = await db
    .select({
      id: complianceItems.id,
      sectionId: complianceItems.sectionId,
      sectionCode: complianceSections.code,
      sectionTitle: complianceSections.title,
      complianceStatus: complianceItems.complianceStatus,
      periodOfNonCompliance: complianceItems.periodOfNonCompliance,
      officersPenalised: complianceItems.officersPenalised,
      penaltyComputation: complianceItems.penaltyComputation,
      totalPayable: complianceItems.totalPayable,
      amountPaid: complianceItems.amountPaid,
      notes: complianceItems.notes,
    })
    .from(complianceItems)
    .leftJoin(
      complianceSections,
      eq(complianceItems.sectionId, complianceSections.id),
    )
    .where(eq(complianceItems.caseId, caseId));

  return {
    ...singleCase,
    complianceItems: items,
  };
};
