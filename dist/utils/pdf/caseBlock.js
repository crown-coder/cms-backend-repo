"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawCaseBlock = void 0;
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
/**
 * Draws a complete case block including:
 * - Case header with status badge and company name
 * - Case info grid (RC, State, Dates, Financials)
 * - Compliance items table with header and zebra striping
 */
const drawCaseBlock = (doc, caseData, drawHeader) => {
    // ========================================================================
    // ESTIMATE SPACE NEEDED
    // ========================================================================
    const complianceCount = Math.min(caseData.complianceItems?.length || 0, 20);
    const estimatedHeight = 150 + complianceCount * 22;
    (0, helpers_1.ensurePageSpace)(doc, estimatedHeight, () => drawHeader(doc, "CASE DETAILS"));
    const startY = doc.y;
    // ========================================================================
    // CASE HEADER BAR
    // ========================================================================
    const statusColor = (0, helpers_1.getStatusColor)(caseData.status);
    const statusBgColor = (0, helpers_1.getStatusBgColor)(caseData.status);
    const statusLabel = (0, helpers_1.getStatusLabel)(caseData.status);
    const headerHeight = 32;
    // Header background
    doc
        .roundedRect(constants_1.PAGE.MARGIN, startY, constants_1.PAGE.CONTENT_WIDTH, headerHeight, 6)
        .fillColor(constants_1.COLORS.lighterGray)
        .fill();
    // Case number
    doc
        .fontSize(10)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.dark)
        .text(`Case #${caseData.id}`, constants_1.PAGE.MARGIN + 12, startY + 7, {
        width: 80,
        lineBreak: false,
    });
    // Status badge
    const badgeLabel = statusLabel;
    doc.fontSize(7).font(constants_1.FONTS.bold);
    const badgeTextWidth = doc.widthOfString(badgeLabel);
    const badgeWidth = badgeTextWidth + 20;
    const badgeX = constants_1.PAGE.MARGIN + 105;
    doc
        .roundedRect(badgeX, startY + 6, badgeWidth, 20, 5)
        .fillColor(statusBgColor)
        .fill();
    doc.fillColor(statusColor).text(badgeLabel, badgeX + 4, startY + 10, {
        width: badgeWidth - 8,
        align: "center",
        lineBreak: false,
    });
    // Company name (right side of header)
    doc
        .fontSize(9)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.dark)
        .text(caseData.companyName, badgeX + badgeWidth + 10, startY + 7, {
        width: constants_1.PAGE.MARGIN + constants_1.PAGE.CONTENT_WIDTH - badgeX - badgeWidth - 22,
        align: "right",
        lineBreak: false,
    });
    doc.y = startY + headerHeight + 10;
    // ========================================================================
    // CASE INFO GRID (3 columns x 2 rows)
    // ========================================================================
    const infoItems = [
        { label: "RC Number", value: caseData.rcNumber || "N/A" },
        { label: "State", value: caseData.state || "N/A" },
        { label: "Status", value: statusLabel },
        { label: "Created", value: (0, helpers_1.formatShortDate)(caseData.createdAt) },
        {
            label: "Resolved",
            value: caseData.resolvedAt
                ? (0, helpers_1.formatShortDate)(caseData.resolvedAt)
                : "Pending",
        },
        {
            label: "Total Penalty",
            value: (0, helpers_1.formatCurrency)(caseData.totalPenalty || 0),
        },
        { label: "Amount Paid", value: (0, helpers_1.formatCurrency)(caseData.totalPaid || 0) },
        {
            label: "Outstanding",
            value: (0, helpers_1.formatCurrency)((parseFloat(caseData.totalPenalty) || 0) -
                (parseFloat(caseData.totalPaid) || 0)),
        },
        {
            label: "Inspection Date",
            value: caseData.inspectionDate
                ? (0, helpers_1.formatShortDate)(caseData.inspectionDate)
                : "N/A",
        },
    ];
    const infoCols = 3;
    const infoColWidth = constants_1.PAGE.CONTENT_WIDTH / infoCols;
    const infoRowHeight = 30;
    const infoStartY = doc.y;
    const infoRows = Math.ceil(infoItems.length / infoCols);
    // Draw alternating row backgrounds
    for (let row = 0; row < infoRows; row++) {
        if (row % 2 === 1) {
            doc
                .rect(constants_1.PAGE.MARGIN, infoStartY + row * infoRowHeight, constants_1.PAGE.CONTENT_WIDTH, infoRowHeight)
                .fillColor(constants_1.COLORS.tableStripe)
                .fill();
        }
    }
    infoItems.forEach((item, idx) => {
        const col = idx % infoCols;
        const row = Math.floor(idx / infoCols);
        const x = constants_1.PAGE.MARGIN + col * infoColWidth;
        const y = infoStartY + row * infoRowHeight;
        // Label
        doc
            .fontSize(constants_1.FONT_SIZES.micro)
            .font(constants_1.FONTS.regular)
            .fillColor(constants_1.COLORS.grayLight)
            .text(item.label.toUpperCase(), x + 6, y + 4, {
            width: infoColWidth - 12,
            lineBreak: false,
        });
        // Value
        doc
            .fontSize(constants_1.FONT_SIZES.caption)
            .font(constants_1.FONTS.bold)
            .fillColor(constants_1.COLORS.dark)
            .text(item.value, x + 6, y + 14, {
            width: infoColWidth - 12,
            lineBreak: false,
        });
    });
    doc.y = infoStartY + infoRows * infoRowHeight + 8;
    // ========================================================================
    // COMPLIANCE ITEMS TABLE
    // ========================================================================
    if (caseData.complianceItems && caseData.complianceItems.length > 0) {
        // Section sub-header
        doc
            .fontSize(constants_1.FONT_SIZES.body)
            .font(constants_1.FONTS.bold)
            .fillColor(constants_1.COLORS.dark)
            .text("Compliance Items", constants_1.PAGE.MARGIN, doc.y);
        doc.moveDown(0.5);
        const tableTop = doc.y;
        // Column definitions
        const columns = [
            { x: constants_1.PAGE.MARGIN, width: 60, label: "CODE" },
            { x: constants_1.PAGE.MARGIN + 60, width: 210, label: "TITLE" },
            { x: constants_1.PAGE.MARGIN + 270, width: 75, label: "STATUS" },
            { x: constants_1.PAGE.MARGIN + 345, width: 75, label: "PAYABLE" },
            { x: constants_1.PAGE.MARGIN + 420, width: 75, label: "PAID" },
        ];
        const headerRowHeight = 20;
        const dataRowHeight = 18;
        const items = caseData.complianceItems.slice(0, 20);
        // ── Table Header ──────────────────────────────────
        doc
            .rect(constants_1.PAGE.MARGIN, tableTop, constants_1.PAGE.CONTENT_WIDTH, headerRowHeight)
            .fillColor(constants_1.COLORS.tableHeader)
            .fill();
        columns.forEach((col) => {
            doc
                .fontSize(6.5)
                .font(constants_1.FONTS.bold)
                .fillColor(constants_1.COLORS.tableHeaderText)
                .text(col.label, col.x + 5, tableTop + 4, {
                width: col.width - 10,
                align: "left",
                lineBreak: false,
            });
        });
        // ── Table Rows ────────────────────────────────────
        let rowY = tableTop + headerRowHeight;
        items.forEach((item, idx) => {
            // Check page space before each row
            if (rowY + dataRowHeight > constants_1.PAGE.HEIGHT - constants_1.PAGE.FOOTER_MARGIN) {
                doc.addPage();
                drawHeader(doc, "CASE DETAILS");
                rowY = doc.y;
                // Repeat header on new page
                doc
                    .rect(constants_1.PAGE.MARGIN, rowY, constants_1.PAGE.CONTENT_WIDTH, headerRowHeight)
                    .fillColor(constants_1.COLORS.tableHeader)
                    .fill();
                columns.forEach((col) => {
                    doc
                        .fontSize(6.5)
                        .font(constants_1.FONTS.bold)
                        .fillColor(constants_1.COLORS.tableHeaderText)
                        .text(col.label, col.x + 5, rowY + 4, {
                        width: col.width - 10,
                        align: "left",
                        lineBreak: false,
                    });
                });
                rowY += headerRowHeight;
            }
            // Zebra striping
            if (idx % 2 === 1) {
                doc
                    .rect(constants_1.PAGE.MARGIN, rowY, constants_1.PAGE.CONTENT_WIDTH, dataRowHeight)
                    .fillColor(constants_1.COLORS.tableStripe)
                    .fill();
            }
            // Row bottom border
            doc
                .moveTo(constants_1.PAGE.MARGIN, rowY + dataRowHeight)
                .lineTo(constants_1.PAGE.MARGIN + constants_1.PAGE.CONTENT_WIDTH, rowY + dataRowHeight)
                .strokeColor(constants_1.COLORS.tableBorder)
                .lineWidth(0.3)
                .stroke();
            // Item status color
            const itemStatusColor = (0, helpers_1.getStatusColor)(item.status);
            const itemStatusLabel = (0, helpers_1.getStatusLabel)(item.status);
            // Row data
            const rowData = [
                { text: item.sectionCode, bold: true, color: constants_1.COLORS.dark },
                { text: item.sectionTitle, bold: false, color: constants_1.COLORS.dark },
                { text: itemStatusLabel, bold: true, color: itemStatusColor },
                {
                    text: (0, helpers_1.formatCurrency)(item.totalPayable),
                    bold: false,
                    color: constants_1.COLORS.dark,
                },
                {
                    text: (0, helpers_1.formatCurrency)(item.amountPaid),
                    bold: false,
                    color: constants_1.COLORS.success,
                },
            ];
            columns.forEach((col, colIdx) => {
                const cell = rowData[colIdx];
                doc
                    .fontSize(7)
                    .font(cell.bold ? constants_1.FONTS.bold : constants_1.FONTS.regular)
                    .fillColor(cell.color)
                    .text(cell.text, col.x + 5, rowY + 3, {
                    width: col.width - 10,
                    align: "left",
                    lineBreak: false,
                });
            });
            rowY += dataRowHeight;
        });
        doc.y = rowY + 6;
        // Show count if truncated
        if (caseData.complianceItems.length > 20) {
            doc
                .fontSize(constants_1.FONT_SIZES.caption)
                .font(constants_1.FONTS.regular)
                .fillColor(constants_1.COLORS.gray)
                .text(`... and ${caseData.complianceItems.length - 20} more items`, constants_1.PAGE.MARGIN, doc.y);
            doc.moveDown(0.3);
        }
    }
    else {
        // No compliance items
        doc
            .fontSize(constants_1.FONT_SIZES.small)
            .font(constants_1.FONTS.regular)
            .fillColor(constants_1.COLORS.grayLight)
            .text("No compliance items recorded", constants_1.PAGE.MARGIN, doc.y, {
            align: "center",
        });
        doc.moveDown(0.5);
    }
    // ========================================================================
    // FINAL SPACING
    // ========================================================================
    doc.y += 6;
};
exports.drawCaseBlock = drawCaseBlock;
