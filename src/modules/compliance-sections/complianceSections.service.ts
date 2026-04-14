import { db } from "../../config/db";
import { complianceSections } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const getSections = async () => {
  return await db.select().from(complianceSections);
};

export const createSection = async (user: any, data: any) => {
  if (!["super_admin", "enforcement_head"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  if (!data.code || !data.title) {
    throw new Error("Code and title are required");
  }

  // Check if code already exists
  const existing = await db
    .select()
    .from(complianceSections)
    .where(eq(complianceSections.code, data.code))
    .limit(1);

  if (existing.length) {
    throw new Error("Compliance section with this code already exists");
  }

  const newSection = await db
    .insert(complianceSections)
    .values({
      code: data.code,
      title: data.title,
      description: data.description || null,
    })
    .returning();

  return newSection[0];
};
