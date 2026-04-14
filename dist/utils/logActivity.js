"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const db_1 = require("../config/db");
const schema_1 = require("../db/schema");
const logActivity = async ({ userId, action, caseId, metadata, }) => {
    try {
        await db_1.db.insert(schema_1.activityLogs).values({
            userId,
            caseId: caseId ?? null,
            action,
            metadata: metadata ? JSON.stringify(metadata) : null,
            createdAt: new Date(),
        });
    }
    catch (error) {
        console.error("Activity log failed:", error);
    }
};
exports.logActivity = logActivity;
