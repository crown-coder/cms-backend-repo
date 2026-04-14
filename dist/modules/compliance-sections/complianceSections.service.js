"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSections = void 0;
const db_1 = require("../../config/db");
const schema_js_1 = require("../../db/schema.js");
const getSections = async () => {
    return await db_1.db.select().from(schema_js_1.complianceSections);
};
exports.getSections = getSections;
