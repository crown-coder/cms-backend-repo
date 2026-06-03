"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportPreview = exports.generateReport = void 0;
const reports_service_1 = require("./reports.service");
const simplePdfGenerator_1 = __importDefault(require("../../utils/simplePdfGenerator"));
const generateReport = async (req, res) => {
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
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }
        if (start > end) {
            return res.status(400).json({
                message: "startDate must be before endDate",
            });
        }
        const reportData = await (0, reports_service_1.generateReportData)({
            startDate: start,
            endDate: end,
            userId: user.id,
            userRole: user.role,
            userState: user.state,
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
        const pdfStream = (0, simplePdfGenerator_1.default)({
            title: "Compliance Case Report",
            startDate: start,
            endDate: end,
            generatedBy: "System",
            reportType: user.role === "super_admin" ? "overall" : "cases",
            summary: sanitizedData.summary,
            cases: sanitizedData.caseDetails,
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="compliance-report-${Date.now()}.pdf"`);
        pdfStream.pipe(res);
    }
    catch (error) {
        console.error("Report generation error:", error);
        res.status(500).json({
            message: error.message || "Failed to generate report",
        });
    }
};
exports.generateReport = generateReport;
const getReportPreview = async (req, res) => {
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
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }
        const reportData = await (0, reports_service_1.generateReportData)({
            startDate: start,
            endDate: end,
            userId: user.id,
            userRole: user.role,
            userState: user.state,
        });
        res.json(reportData);
    }
    catch (error) {
        console.error("Report preview error:", error);
        res.status(500).json({
            message: error.message || "Failed to generate report preview",
        });
    }
};
exports.getReportPreview = getReportPreview;
