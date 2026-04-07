import { db } from "../config/db";
import { activityLogs } from "../db/schema";

interface LogActivityParams {
  userId: number;
  action: string;
  caseId?: number;
  metadata?: any;
}

export const logActivity = async ({
  userId,
  action,
  caseId,
  metadata,
}: LogActivityParams) => {
  try {
    await db.insert(activityLogs).values({
      userId,
      caseId: caseId ?? null,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Activity log failed:", error);
  }
};
