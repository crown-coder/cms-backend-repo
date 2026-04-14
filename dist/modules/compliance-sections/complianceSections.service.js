"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSection = exports.getSections = void 0;
const db_1 = require("../../config/db");
const schema_js_1 = require("../../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const getSections = async () => {
    return await db_1.db.select().from(schema_js_1.complianceSections);
};
exports.getSections = getSections;
const createSection = async (user, data) => {
    if (!["super_admin", "enforcement_head"].includes(user.role)) {
        throw new Error("Unauthorized");
    }
    if (!data.code || !data.title) {
        throw new Error("Code and title are required");
    }
    // Check if code already exists
    const existing = await db_1.db
        .select()
        .from(schema_js_1.complianceSections)
        .where((0, drizzle_orm_1.eq)(schema_js_1.complianceSections.code, data.code))
        .limit(1);
    if (existing.length) {
        throw new Error("Compliance section with this code already exists");
    }
    const newSection = await db_1.db
        .insert(schema_js_1.complianceSections)
        .values({
        code: data.code,
        title: data.title,
        description: data.description || null,
    })
        .returning();
    return newSection[0];
};
exports.createSection = createSection;
