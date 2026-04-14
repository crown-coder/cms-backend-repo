"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaseById = exports.resolveCase = exports.getCases = exports.createCase = void 0;
const db_1 = require("../../config/db");
const schema_js_1 = require("../../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const logActivity_1 = require("../../utils/logActivity");
const createCase = async (user, data) => {
    const newCase = await db_1.db
        .insert(schema_js_1.cases)
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
    await (0, logActivity_1.logActivity)({
        userId: user.id,
        caseId: newCase[0].id,
        action: "Case created",
    });
    return newCase[0];
};
exports.createCase = createCase;
const getCases = async (user) => {
    if (user.role === "super_admin") {
        return await db_1.db.select().from(schema_js_1.cases);
    }
    if (user.role === "enforcement_head") {
        const states = await db_1.db
            .select()
            .from(schema_js_1.enforcementHeadStates)
            .where((0, drizzle_orm_1.eq)(schema_js_1.enforcementHeadStates.enforcementHeadId, user.id));
        const stateList = states.map((s) => s.state);
        return await db_1.db.select().from(schema_js_1.cases).where((0, drizzle_orm_1.inArray)(schema_js_1.cases.state, stateList));
    }
    if (user.role === "state_controller" || user.role === "officer") {
        if (!user.state) {
            throw new Error("User is not assigned to a state");
        }
        return await db_1.db.select().from(schema_js_1.cases).where((0, drizzle_orm_1.eq)(schema_js_1.cases.state, user.state));
    }
    throw new Error("Unauthorized");
};
exports.getCases = getCases;
const resolveCase = async (caseId, user, data) => {
    if (!["super_admin", "enforcement_head"].includes(user.role)) {
        throw new Error("Unauthorized");
    }
    const caseRows = await db_1.db
        .select()
        .from(schema_js_1.cases)
        .where((0, drizzle_orm_1.eq)(schema_js_1.cases.id, caseId))
        .limit(1);
    if (!caseRows.length) {
        throw new Error("Case not found");
    }
    const existingCase = caseRows[0];
    if (["resolved", "suspended"].includes(existingCase.status)) {
        throw new Error("Case cannot be changed after final disposition");
    }
    const updates = {
        resolutionType: data.resolutionType,
        resolutionRemark: data.remark ?? null,
    };
    if (data.resolutionType === "payment_complete") {
        const totalPenalty = Number(existingCase.totalPenalty ?? 0);
        const totalPaid = Number(existingCase.totalPaid ?? 0);
        if (totalPaid < totalPenalty) {
            throw new Error("Case cannot be resolved before full payment");
        }
        updates.status = "resolved";
        updates.resolvedBy = user.id;
        updates.resolvedAt = new Date();
    }
    if (data.resolutionType === "penalty_waived") {
        const reduction = Number(data.penaltyReduction ?? 0);
        const totalPenalty = Number(existingCase.totalPenalty ?? 0);
        if (reduction <= 0) {
            throw new Error("Penalty reduction must be greater than zero");
        }
        if (reduction > totalPenalty) {
            throw new Error("Penalty reduction cannot exceed total penalty");
        }
        updates.status = "resolved";
        updates.penaltyReduction = reduction.toString();
        updates.resolvedBy = user.id;
        updates.resolvedAt = new Date();
    }
    if (data.resolutionType === "suspended") {
        if (!data.suspensionReason && !data.remark) {
            throw new Error("Suspension reason is required");
        }
        updates.status = "suspended";
        updates.suspensionReason = data.suspensionReason ?? data.remark ?? null;
        updates.suspendedUntil = data.suspendedUntil
            ? new Date(data.suspendedUntil)
            : null;
    }
    const updated = await db_1.db
        .update(schema_js_1.cases)
        .set(updates)
        .where((0, drizzle_orm_1.eq)(schema_js_1.cases.id, caseId))
        .returning();
    if (!updated.length) {
        throw new Error("Case update failed");
    }
    await (0, logActivity_1.logActivity)({
        userId: user.id,
        caseId,
        action: `Case ${data.resolutionType.replace("_", " ")}`,
        metadata: data,
    });
    return updated[0];
};
exports.resolveCase = resolveCase;
/* =========================
   GET CASE BY ID
========================= */
const getCaseById = async (user, caseId) => {
    const caseData = await db_1.db
        .select()
        .from(schema_js_1.cases)
        .where((0, drizzle_orm_1.eq)(schema_js_1.cases.id, caseId))
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
        const states = await db_1.db
            .select()
            .from(schema_js_1.enforcementHeadStates)
            .where((0, drizzle_orm_1.eq)(schema_js_1.enforcementHeadStates.enforcementHeadId, user.id));
        const stateList = states.map((s) => s.state);
        if (!stateList.includes(singleCase.state)) {
            throw new Error("Unauthorized to view this case");
        }
    }
    const items = await db_1.db
        .select({
        id: schema_js_1.complianceItems.id,
        sectionId: schema_js_1.complianceItems.sectionId,
        sectionCode: schema_js_1.complianceSections.code,
        sectionTitle: schema_js_1.complianceSections.title,
        complianceStatus: schema_js_1.complianceItems.complianceStatus,
        periodOfNonCompliance: schema_js_1.complianceItems.periodOfNonCompliance,
        officersPenalised: schema_js_1.complianceItems.officersPenalised,
        penaltyComputation: schema_js_1.complianceItems.penaltyComputation,
        totalPayable: schema_js_1.complianceItems.totalPayable,
        amountPaid: schema_js_1.complianceItems.amountPaid,
        notes: schema_js_1.complianceItems.notes,
    })
        .from(schema_js_1.complianceItems)
        .leftJoin(schema_js_1.complianceSections, (0, drizzle_orm_1.eq)(schema_js_1.complianceItems.sectionId, schema_js_1.complianceSections.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.complianceItems.caseId, caseId));
    return {
        ...singleCase,
        complianceItems: items,
    };
};
exports.getCaseById = getCaseById;
