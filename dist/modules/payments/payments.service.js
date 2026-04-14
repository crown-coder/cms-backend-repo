"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayments = exports.updateCaseTotalPaid = exports.recordPayment = void 0;
const db_1 = require("../../config/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const logActivity_1 = require("../../utils/logActivity");
const recordPayment = async (user, caseId, data) => {
    // Verify case exists
    const caseRows = await db_1.db
        .select()
        .from(schema_1.cases)
        .where((0, drizzle_orm_1.eq)(schema_1.cases.id, caseId))
        .limit(1);
    if (!caseRows.length) {
        throw new Error("Case not found");
    }
    const amount = Number(data.amount);
    if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
    }
    // Insert payment
    const payment = await db_1.db
        .insert(schema_1.payments)
        .values({
        caseId,
        amount: amount.toString(),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    })
        .returning();
    // Update case totals
    await (0, exports.updateCaseTotalPaid)(caseId);
    // Log activity
    await (0, logActivity_1.logActivity)({
        userId: user.id,
        caseId,
        action: "Payment recorded",
        metadata: {
            amount,
            paymentDate: data.paymentDate,
        },
    });
    return payment[0];
};
exports.recordPayment = recordPayment;
const updateCaseTotalPaid = async (caseId) => {
    // Sum all payments for this case
    const paymentResult = await db_1.db.execute(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE case_id = ${caseId}`);
    const totalPaid = paymentResult.rows[0].total;
    // Update case
    await db_1.db
        .update(schema_1.cases)
        .set({
        totalPaid: totalPaid.toString(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.cases.id, caseId));
};
exports.updateCaseTotalPaid = updateCaseTotalPaid;
const getPayments = async (caseId) => {
    const paymentList = await db_1.db
        .select()
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.eq)(schema_1.payments.caseId, caseId));
    return paymentList;
};
exports.getPayments = getPayments;
