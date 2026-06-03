// caseBlock.ts
import PDFDocument from "pdfkit";
import { PAGE, COLORS, FONTS, FONT_SIZES } from "./constants";
import {
  formatCurrency,
  formatShortDate,
  getStatusLabel,
  getStatusColor,
  getStatusBgColor,
  ensurePageSpace,
  drawSeparator,
} from "./helpers";

/**
 * Draws a complete case block including:
 * - Case header with status badge and company name
 * - Case info grid (RC, State, Dates, Financials)
 * - Compliance items table with header and zebra striping
 */
export const drawCaseBlock = (
  doc: PDFKit.PDFDocument,
  caseData: any,
  drawHeader: Function,
): void => {
  // ========================================================================
  // ESTIMATE SPACE NEEDED
  // ========================================================================
  const complianceCount = Math.min(caseData.complianceItems?.length || 0, 20);
  const estimatedHeight = 150 + complianceCount * 22;

  ensurePageSpace(doc, estimatedHeight, () => drawHeader(doc, "CASE DETAILS"));

  const startY = doc.y;

  // ========================================================================
  // CASE HEADER BAR
  // ========================================================================
  const statusColor = getStatusColor(caseData.status);
  const statusBgColor = getStatusBgColor(caseData.status);
  const statusLabel = getStatusLabel(caseData.status);
  const headerHeight = 32;

  // Header background
  doc
    .roundedRect(PAGE.MARGIN, startY, PAGE.CONTENT_WIDTH, headerHeight, 6)
    .fillColor(COLORS.lighterGray)
    .fill();

  // Case number
  doc
    .fontSize(10)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(`Case #${caseData.id}`, PAGE.MARGIN + 12, startY + 7, {
      width: 80,
      lineBreak: false,
    });

  // Status badge
  const badgeLabel = statusLabel;
  doc.fontSize(7).font(FONTS.bold);
  const badgeTextWidth = doc.widthOfString(badgeLabel);
  const badgeWidth = badgeTextWidth + 20;
  const badgeX = PAGE.MARGIN + 105;

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
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(caseData.companyName, badgeX + badgeWidth + 10, startY + 7, {
      width: PAGE.MARGIN + PAGE.CONTENT_WIDTH - badgeX - badgeWidth - 22,
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
    { label: "Created", value: formatShortDate(caseData.createdAt) },
    {
      label: "Resolved",
      value: caseData.resolvedAt
        ? formatShortDate(caseData.resolvedAt)
        : "Pending",
    },
    {
      label: "Total Penalty",
      value: formatCurrency(caseData.totalPenalty || 0),
    },
    { label: "Amount Paid", value: formatCurrency(caseData.totalPaid || 0) },
    {
      label: "Outstanding",
      value: formatCurrency(
        (parseFloat(caseData.totalPenalty) || 0) -
          (parseFloat(caseData.totalPaid) || 0),
      ),
    },
    {
      label: "Inspection Date",
      value: caseData.inspectionDate
        ? formatShortDate(caseData.inspectionDate)
        : "N/A",
    },
  ];

  const infoCols = 3;
  const infoColWidth = PAGE.CONTENT_WIDTH / infoCols;
  const infoRowHeight = 30;
  const infoStartY = doc.y;
  const infoRows = Math.ceil(infoItems.length / infoCols);

  // Draw alternating row backgrounds
  for (let row = 0; row < infoRows; row++) {
    if (row % 2 === 1) {
      doc
        .rect(
          PAGE.MARGIN,
          infoStartY + row * infoRowHeight,
          PAGE.CONTENT_WIDTH,
          infoRowHeight,
        )
        .fillColor(COLORS.tableStripe)
        .fill();
    }
  }

  infoItems.forEach((item, idx) => {
    const col = idx % infoCols;
    const row = Math.floor(idx / infoCols);
    const x = PAGE.MARGIN + col * infoColWidth;
    const y = infoStartY + row * infoRowHeight;

    // Label
    doc
      .fontSize(FONT_SIZES.micro)
      .font(FONTS.regular)
      .fillColor(COLORS.grayLight)
      .text(item.label.toUpperCase(), x + 6, y + 4, {
        width: infoColWidth - 12,
        lineBreak: false,
      });

    // Value
    doc
      .fontSize(FONT_SIZES.caption)
      .font(FONTS.bold)
      .fillColor(COLORS.dark)
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
      .fontSize(FONT_SIZES.body)
      .font(FONTS.bold)
      .fillColor(COLORS.dark)
      .text("Compliance Items", PAGE.MARGIN, doc.y);

    doc.moveDown(0.5);

    const tableTop = doc.y;

    // Column definitions
    const columns = [
      { x: PAGE.MARGIN, width: 60, label: "CODE" },
      { x: PAGE.MARGIN + 60, width: 210, label: "TITLE" },
      { x: PAGE.MARGIN + 270, width: 75, label: "STATUS" },
      { x: PAGE.MARGIN + 345, width: 75, label: "PAYABLE" },
      { x: PAGE.MARGIN + 420, width: 75, label: "PAID" },
    ];

    const headerRowHeight = 20;
    const dataRowHeight = 18;
    const items = caseData.complianceItems.slice(0, 20);

    // ── Table Header ──────────────────────────────────
    doc
      .rect(PAGE.MARGIN, tableTop, PAGE.CONTENT_WIDTH, headerRowHeight)
      .fillColor(COLORS.tableHeader)
      .fill();

    columns.forEach((col) => {
      doc
        .fontSize(6.5)
        .font(FONTS.bold)
        .fillColor(COLORS.tableHeaderText)
        .text(col.label, col.x + 5, tableTop + 4, {
          width: col.width - 10,
          align: "left",
          lineBreak: false,
        });
    });

    // ── Table Rows ────────────────────────────────────
    let rowY = tableTop + headerRowHeight;

    items.forEach((item: any, idx: number) => {
      // Check page space before each row
      if (rowY + dataRowHeight > PAGE.HEIGHT - PAGE.FOOTER_MARGIN) {
        doc.addPage();
        drawHeader(doc, "CASE DETAILS");
        rowY = doc.y;

        // Repeat header on new page
        doc
          .rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, headerRowHeight)
          .fillColor(COLORS.tableHeader)
          .fill();

        columns.forEach((col) => {
          doc
            .fontSize(6.5)
            .font(FONTS.bold)
            .fillColor(COLORS.tableHeaderText)
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
          .rect(PAGE.MARGIN, rowY, PAGE.CONTENT_WIDTH, dataRowHeight)
          .fillColor(COLORS.tableStripe)
          .fill();
      }

      // Row bottom border
      doc
        .moveTo(PAGE.MARGIN, rowY + dataRowHeight)
        .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, rowY + dataRowHeight)
        .strokeColor(COLORS.tableBorder)
        .lineWidth(0.3)
        .stroke();

      // Item status color
      const itemStatusColor = getStatusColor(item.status);
      const itemStatusLabel = getStatusLabel(item.status);

      // Row data
      const rowData = [
        { text: item.sectionCode, bold: true, color: COLORS.dark },
        { text: item.sectionTitle, bold: false, color: COLORS.dark },
        { text: itemStatusLabel, bold: true, color: itemStatusColor },
        {
          text: formatCurrency(item.totalPayable),
          bold: false,
          color: COLORS.dark,
        },
        {
          text: formatCurrency(item.amountPaid),
          bold: false,
          color: COLORS.success,
        },
      ];

      columns.forEach((col, colIdx) => {
        const cell = rowData[colIdx];
        doc
          .fontSize(7)
          .font(cell.bold ? FONTS.bold : FONTS.regular)
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
        .fontSize(FONT_SIZES.caption)
        .font(FONTS.regular)
        .fillColor(COLORS.gray)
        .text(
          `... and ${caseData.complianceItems.length - 20} more items`,
          PAGE.MARGIN,
          doc.y,
        );
      doc.moveDown(0.3);
    }
  } else {
    // No compliance items
    doc
      .fontSize(FONT_SIZES.small)
      .font(FONTS.regular)
      .fillColor(COLORS.grayLight)
      .text("No compliance items recorded", PAGE.MARGIN, doc.y, {
        align: "center",
      });
    doc.moveDown(0.5);
  }

  // ========================================================================
  // FINAL SPACING
  // ========================================================================
  doc.y += 6;
};
