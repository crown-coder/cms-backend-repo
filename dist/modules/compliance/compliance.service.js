"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComplianceItem = void 0;
const db_1 = require("../../config/db");
const schema_js_1 = require("../../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const logActivity_1 = require("../../utils/logActivity");
/* =========================
   Add Compliance Item
========================= */
const addComplianceItem = async (user, caseId, data) => {
    /* -------------------------
       1️⃣ Validate section exists
    ------------------------- */
    const section = await db_1.db
        .select()
        .from(schema_js_1.complianceSections)
        .where((0, drizzle_orm_1.eq)(schema_js_1.complianceSections.id, data.sectionId))
        .limit(1);
    if (!section.length) {
        throw new Error("Invalid compliance section");
    }
    /* -------------------------
       2️⃣ Prevent duplicate section per case
    ------------------------- */
    const existing = await db_1.db
        .select()
        .from(schema_js_1.complianceItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.complianceItems.caseId, caseId), (0, drizzle_orm_1.eq)(schema_js_1.complianceItems.sectionId, data.sectionId)))
        .limit(1);
    if (existing.length) {
        throw new Error("This section already exists for this case");
    }
    /* -------------------------
       3️⃣ Insert compliance item
    ------------------------- */
    const newItem = await db_1.db
        .insert(schema_js_1.complianceItems)
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
    await (0, logActivity_1.logActivity)({
        userId: user.id,
        caseId,
        action: "Compliance item added",
        metadata: {
            sectionId: data.sectionId,
        },
    });
    return newItem[0];
};
exports.addComplianceItem = addComplianceItem;
/* =========================
   Recalculate Totals
========================= */
const recalculateCaseTotals = async (caseId) => {
    const items = await db_1.db
        .select()
        .from(schema_js_1.complianceItems)
        .where((0, drizzle_orm_1.eq)(schema_js_1.complianceItems.caseId, caseId));
    let totalPenalty = 0;
    let totalPaid = 0;
    for (const item of items) {
        totalPenalty += Number(item.totalPayable ?? 0);
        totalPaid += Number(item.amountPaid ?? 0);
    }
    await db_1.db
        .update(schema_js_1.cases)
        .set({
        totalPenalty: totalPenalty.toString(),
        totalPaid: totalPaid.toString(),
    })
        .where((0, drizzle_orm_1.eq)(schema_js_1.cases.id, caseId));
};
