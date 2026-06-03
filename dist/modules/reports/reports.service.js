"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportData = void 0;
const db_1 = require("../../config/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const buildCaseFilters = (params) => {
    const dateFilter = (0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.cases.createdAt, params.startDate), (0, drizzle_orm_1.lte)(schema_1.cases.createdAt, params.endDate));
    if (params.userRole === "super_admin") {
        return dateFilter;
    }
    if (params.userRole === "enforcement_head") {
        const state = (params.userState || "");
        return (0, drizzle_orm_1.and)(dateFilter, (0, drizzle_orm_1.eq)(schema_1.cases.state, state));
    }
    if (params.userRole === "state_controller") {
        const state = (params.userState || "");
        return (0, drizzle_orm_1.and)(dateFilter, (0, drizzle_orm_1.eq)(schema_1.cases.state, state));
    }
    if (params.userRole === "officer") {
        return (0, drizzle_orm_1.and)(dateFilter, (0, drizzle_orm_1.eq)(schema_1.cases.createdBy, params.userId));
    }
    throw new Error("Invalid user role");
};
const generateReportData = async (params) => {
    const filters = buildCaseFilters(params);
    const allCases = await db_1.db.select().from(schema_1.cases).where(filters);
    const totalCases = allCases.length;
    const resolvedCases = allCases.filter((c) => c.status === "resolved").length;
    const pendingCases = allCases.filter((c) => c.status === "pending" || c.status === "in_progress").length;
    let totalPenalty = 0;
    let totalPaid = 0;
    allCases.forEach((c) => {
        totalPenalty += parseFloat(c.totalPenalty || "0");
        totalPaid += parseFloat(c.totalPaid || "0");
    });
    const outstandingBalance = totalPenalty - totalPaid;
    const caseDetails = await Promise.all(allCases.map(async (caseRecord) => {
        const caseCompliance = await db_1.db
            .select({
            id: schema_1.complianceItems.id,
            sectionId: schema_1.complianceItems.sectionId,
            status: schema_1.complianceItems.complianceStatus,
            totalPayable: schema_1.complianceItems.totalPayable,
            amountPaid: schema_1.complianceItems.amountPaid,
        })
            .from(schema_1.complianceItems)
            .where((0, drizzle_orm_1.eq)(schema_1.complianceItems.caseId, caseRecord.id));
        const completeItems = await Promise.all(caseCompliance.map(async (item) => {
            const section = await db_1.db
                .select({
                code: schema_1.complianceSections.code,
                title: schema_1.complianceSections.title,
            })
                .from(schema_1.complianceSections)
                .where((0, drizzle_orm_1.eq)(schema_1.complianceSections.id, item.sectionId))
                .limit(1);
            return {
                sectionCode: String(section[0]?.code || "N/A").substring(0, 50),
                sectionTitle: String(section[0]?.title || "N/A").substring(0, 200),
                status: String(item.status || "").substring(0, 50),
                totalPayable: String(item.totalPayable || "0").substring(0, 50),
                amountPaid: String(item.amountPaid || "0").substring(0, 50),
            };
        }));
        return {
            id: caseRecord.id,
            companyName: String(caseRecord.companyName || "N/A").substring(0, 200),
            rcNumber: String(caseRecord.rcNumber || "N/A").substring(0, 50),
            state: String(caseRecord.state || "").substring(0, 50),
            status: String(caseRecord.status || "pending").substring(0, 50),
            createdAt: caseRecord.createdAt?.toISOString() || new Date().toISOString(),
            resolvedAt: caseRecord.resolvedAt?.toISOString() || null,
            totalPenalty: String(caseRecord.totalPenalty || "0").substring(0, 50),
            totalPaid: String(caseRecord.totalPaid || "0").substring(0, 50),
            complianceItems: completeItems,
        };
    }));
    return {
        summary: {
            totalCases,
            resolvedCases,
            pendingCases,
            totalPenalty: totalPenalty.toFixed(2),
            totalPaid: totalPaid.toFixed(2),
            outstandingBalance: Math.max(0, outstandingBalance).toFixed(2),
        },
        caseDetails,
    };
};
exports.generateReportData = generateReportData;
