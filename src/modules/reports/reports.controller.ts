import { Request, Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware";
import { generateReportData } from "./reports.service";
import simplePdfGenerator from "../../utils/simplePdfGenerator";

export const generateReport = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start > end) {
      return res.status(400).json({
        message: "startDate must be before endDate",
      });
    }

    const reportData = await generateReportData({
      startDate: start,
      endDate: end,
      userId: user.id,
      userRole: user.role,
      userState: (user as any).state,
    });

    // Sanitize data to prevent circular references
    const sanitizedData = {
      ...reportData,
      summary: {
        totalCases: reportData.summary.totalCases,
        resolvedCases: reportData.summary.resolvedCases,
        pendingCases: reportData.summary.pendingCases,
        totalPenalty: String(reportData.summary.totalPenalty),
        totalPaid: String(reportData.summary.totalPaid),
        outstandingBalance: String(reportData.summary.outstandingBalance),
      },
      caseDetails: reportData.caseDetails.slice(0, 100).map((c) => ({
        id: c.id,
        companyName: String(c.companyName).substring(0, 200),
        rcNumber: String(c.rcNumber).substring(0, 50),
        state: String(c.state).substring(0, 50),
        status: String(c.status).substring(0, 50),
        createdAt: String(c.createdAt),
        resolvedAt: c.resolvedAt ? String(c.resolvedAt) : null,
        totalPenalty: String(c.totalPenalty).substring(0, 50),
        totalPaid: String(c.totalPaid).substring(0, 50),
        complianceItems: c.complianceItems.slice(0, 50).map((item) => ({
          sectionCode: String(item.sectionCode).substring(0, 50),
          sectionTitle: String(item.sectionTitle).substring(0, 200),
          status: String(item.status).substring(0, 50),
          totalPayable: String(item.totalPayable).substring(0, 50),
          amountPaid: String(item.amountPaid).substring(0, 50),
        })),
      })),
    };

    const pdfStream = simplePdfGenerator({
      title: "Compliance Case Report",
      startDate: start,
      endDate: end,
      generatedBy: "System",
      reportType: user.role === "super_admin" ? "overall" : "cases",
      summary: sanitizedData.summary,
      cases: sanitizedData.caseDetails,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="compliance-report-${Date.now()}.pdf"`,
    );

    pdfStream.pipe(res);
  } catch (error: any) {
    console.error("Report generation error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate report",
    });
  }
};

export const getReportPreview = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const reportData = await generateReportData({
      startDate: start,
      endDate: end,
      userId: user.id,
      userRole: user.role,
      userState: (user as any).state,
    });

    res.json(reportData);
  } catch (error: any) {
    console.error("Report preview error:", error);
    res.status(500).json({
      message: error.message || "Failed to generate report preview",
    });
  }
};
