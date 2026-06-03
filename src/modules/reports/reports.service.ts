import { db } from "../../config/db";
import {
  cases,
  complianceSections,
  complianceItems,
  users,
  payments,
} from "../../db/schema";
import { eq, and, gte, lte, inArray, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

interface ReportParams {
  startDate: Date;
  endDate: Date;
  userId: number;
  userRole: string;
  userState?: string | null;
}

interface ReportData {
  summary: {
    totalCases: number;
    resolvedCases: number;
    pendingCases: number;
    totalPenalty: string;
    totalPaid: string;
    outstandingBalance: string;
  };
  caseDetails: Array<{
    id: number;
    companyName: string;
    rcNumber: string;
    state: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
    totalPenalty: string;
    totalPaid: string;
    complianceItems: Array<{
      sectionCode: string;
      sectionTitle: string;
      status: string;
      totalPayable: string;
      amountPaid: string;
    }>;
  }>;
}

const buildCaseFilters = (params: ReportParams) => {
  const dateFilter = and(
    gte(cases.createdAt, params.startDate),
    lte(cases.createdAt, params.endDate),
  );

  if (params.userRole === "super_admin") {
    return dateFilter;
  }

  if (params.userRole === "enforcement_head") {
    const state = (params.userState || "") as any;
    return and(dateFilter, eq(cases.state, state));
  }

  if (params.userRole === "state_controller") {
    const state = (params.userState || "") as any;
    return and(dateFilter, eq(cases.state, state));
  }

  if (params.userRole === "officer") {
    return and(dateFilter, eq(cases.createdBy, params.userId));
  }

  throw new Error("Invalid user role");
};

export const generateReportData = async (
  params: ReportParams,
): Promise<ReportData> => {
  const filters = buildCaseFilters(params);

  const allCases = await db.select().from(cases).where(filters);

  const totalCases = allCases.length;
  const resolvedCases = allCases.filter((c) => c.status === "resolved").length;
  const pendingCases = allCases.filter(
    (c) => c.status === "pending" || c.status === "in_progress",
  ).length;

  let totalPenalty = 0;
  let totalPaid = 0;

  allCases.forEach((c) => {
    totalPenalty += parseFloat(c.totalPenalty || "0");
    totalPaid += parseFloat(c.totalPaid || "0");
  });

  const outstandingBalance = totalPenalty - totalPaid;

  const caseDetails = await Promise.all(
    allCases.map(async (caseRecord) => {
      const caseCompliance = await db
        .select({
          id: complianceItems.id,
          sectionId: complianceItems.sectionId,
          status: complianceItems.complianceStatus,
          totalPayable: complianceItems.totalPayable,
          amountPaid: complianceItems.amountPaid,
        })
        .from(complianceItems)
        .where(eq(complianceItems.caseId, caseRecord.id));

      const completeItems = await Promise.all(
        caseCompliance.map(async (item) => {
          const section = await db
            .select({
              code: complianceSections.code,
              title: complianceSections.title,
            })
            .from(complianceSections)
            .where(eq(complianceSections.id, item.sectionId))
            .limit(1);

          return {
            sectionCode: String(section[0]?.code || "N/A").substring(0, 50),
            sectionTitle: String(section[0]?.title || "N/A").substring(0, 200),
            status: String(item.status || "").substring(0, 50),
            totalPayable: String(item.totalPayable || "0").substring(0, 50),
            amountPaid: String(item.amountPaid || "0").substring(0, 50),
          };
        }),
      );

      return {
        id: caseRecord.id,
        companyName: String(caseRecord.companyName || "N/A").substring(0, 200),
        rcNumber: String(caseRecord.rcNumber || "N/A").substring(0, 50),
        state: String(caseRecord.state || "").substring(0, 50),
        status: String(caseRecord.status || "pending").substring(0, 50),
        createdAt:
          caseRecord.createdAt?.toISOString() || new Date().toISOString(),
        resolvedAt: caseRecord.resolvedAt?.toISOString() || null,
        totalPenalty: String(caseRecord.totalPenalty || "0").substring(0, 50),
        totalPaid: String(caseRecord.totalPaid || "0").substring(0, 50),
        complianceItems: completeItems,
      };
    }),
  );

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
