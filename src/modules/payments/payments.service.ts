import { db } from "../../config/db";
import { payments, cases, complianceItems } from "../../db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "../../utils/logActivity";

export const recordPayment = async (
  user: any,
  caseId: number,
  data: {
    amount: string | number;
    paymentDate?: string | Date;
  },
) => {
  // Verify case exists
  const caseRows = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!caseRows.length) {
    throw new Error("Case not found");
  }

  const amount = Number(data.amount);

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Insert payment
  const payment = await db
    .insert(payments)
    .values({
      caseId,
      amount: amount.toString(),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    })
    .returning();

  // Update case totals
  await updateCaseTotalPaid(caseId);

  // Log activity
  await logActivity({
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

export const updateCaseTotalPaid = async (caseId: number) => {
  // Sum all payments for this case
  const paymentResult = await db.execute(
    `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE case_id = ${caseId}`,
  );

  const totalPaid = paymentResult.rows[0].total;

  // Update case
  await db
    .update(cases)
    .set({
      totalPaid: totalPaid.toString(),
    })
    .where(eq(cases.id, caseId));
};

export const getPayments = async (caseId: number) => {
  const paymentList = await db
    .select()
    .from(payments)
    .where(eq(payments.caseId, caseId));

  return paymentList;
};
