import { db } from "@/config/db";
import { complianceSections } from "@/db/schema.js";

export const getSections = async () => {
  return await db.select().from(complianceSections);
};
