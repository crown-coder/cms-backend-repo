import PDFDocument from "pdfkit";
import { Readable } from "stream";
import path from "path";
import fs from "fs";

// ============================================================================
// TYPES
// ============================================================================

interface ReportOptions {
  title: string;
  startDate: Date;
  endDate: Date;
  generatedBy: string;
  reportType: "overall" | "cases";
  summary: {
    totalCases: number;
    resolvedCases: number;
    pendingCases: number;
    totalPenalty: string;
    totalPaid: string;
    outstandingBalance: string;
  };
  cases: Array<{
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

interface TableColumn {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
}

interface CardItem {
  label: string;
  value: string;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE = {
  WIDTH: 595.28, // A4
  HEIGHT: 841.89,
  MARGIN: 50,
  CONTENT_WIDTH: 495, // PAGE.WIDTH - (MARGIN * 2)
  FOOTER_MARGIN: 80,
};

const COLORS = {
  primary: "#166534",
  primaryLight: "#22C55E",
  dark: "#1F2937",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  accent: "#F0FDF4",
  border: "#D1D5DB",
  tableHeader: "#166534",
  tableStripe: "#F9FAFB",
  danger: "#DC2626",
  warning: "#EA580C",
};

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  mono: "Courier",
};

// ============================================================================
// CONTEXT — Shared state across all helpers
// ============================================================================

interface PDFContext {
  doc: PDFKit.PDFDocument;
  refNumber: string;
  reportTitle: string;
  reportSubtitle: string;
  options: ReportOptions;
}

// ============================================================================
// FONT REGISTRATION (Unicode / Currency fix)
// ============================================================================

const registerFonts = (doc: PDFKit.PDFDocument) => {
  // Attempt to register DejaVu Sans for better Unicode support (₦ symbol)
  const fontPaths = [
    path.join(process.cwd(), "fonts", "DejaVuSans.ttf"),
    path.join(process.cwd(), "fonts", "DejaVuSans-Bold.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ];

  let fontsRegistered = false;

  // Try DejaVu Sans
  if (fs.existsSync(fontPaths[0]) && fs.existsSync(fontPaths[1])) {
    doc.registerFont("DejaVuSans", fontPaths[0]);
    doc.registerFont("DejaVuSans-Bold", fontPaths[1]);
    fontsRegistered = true;
  } else if (fs.existsSync(fontPaths[2]) && fs.existsSync(fontPaths[3])) {
    doc.registerFont("DejaVuSans", fontPaths[2]);
    doc.registerFont("DejaVuSans-Bold", fontPaths[3]);
    fontsRegistered = true;
  }

  if (fontsRegistered) {
    FONTS.regular = "DejaVuSans";
    FONTS.bold = "DejaVuSans-Bold";
    FONTS.mono = "DejaVuSans";
  }
};

// ============================================================================
// UTILITY HELPERS
// ============================================================================

const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₦0";
  return `₦${num.toLocaleString("en-NG")}`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    resolved: "#166534",
    pending: "#EA580C",
    in_progress: "#2563EB",
    escalated: "#7C3AED",
    suspended: "#6B7280",
    compliant: "#166534",
    non_compliant: "#DC2626",
  };
  return colors[status] || COLORS.gray;
};

/**
 * Ensures there is enough space on the current page.
 * If not, adds a new page and redraws the header.
 */
const ensureSpace = (ctx: PDFContext, requiredHeight: number) => {
  const { doc } = ctx;
  if (doc.y + requiredHeight > PAGE.HEIGHT - PAGE.FOOTER_MARGIN) {
    doc.addPage();
    drawHeader(ctx);
  }
};

// ============================================================================
// LOGO DRAWING
// ============================================================================

const drawLogo = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size: number = 45,
) => {
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, x, y, { width: size, height: size });
      return;
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: drawn logo
  doc.save();
  doc
    .roundedRect(x, y, size, size, 8)
    .fillColor(COLORS.primaryLight)
    .fillOpacity(0.2)
    .fill()
    .fillOpacity(1);

  const innerSize = size - 8;
  const innerX = x + 4;
  const innerY = y + 4;

  doc
    .roundedRect(innerX, innerY, innerSize, innerSize, 6)
    .fillColor(COLORS.primary)
    .fill();

  doc
    .fontSize(size * 0.31)
    .font(FONTS.bold)
    .fillColor(COLORS.white)
    .text("CAC", innerX, innerY + innerSize / 4, {
      width: innerSize,
      align: "center",
    });
  doc.restore();
};

// ============================================================================
// PAGE TEMPLATES (Header / Footer)
// ============================================================================

const drawHeader = (ctx: PDFContext) => {
  const { doc, refNumber } = ctx;

  const logoSize = 45;
  const headerTop = 30;

  doc.save();

  // Logo
  drawLogo(doc, PAGE.MARGIN, headerTop, logoSize);

  // Header text
  doc
    .fontSize(16)
    .font(FONTS.bold)
    .fillColor(COLORS.primary)
    .text(
      "Corporate Affairs Commission",
      PAGE.MARGIN + logoSize + 15,
      headerTop + 2,
      {
        width: 300,
      },
    );

  doc
    .fontSize(8)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text(
      "Compliance Management System",
      PAGE.MARGIN + logoSize + 15,
      headerTop + 24,
    );

  // Reference number & Confidential
  doc
    .fontSize(7)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text(`Reference: ${refNumber}`, PAGE.MARGIN, headerTop, {
      width: PAGE.CONTENT_WIDTH,
      align: "right",
    })
    .text("Confidential", PAGE.MARGIN, headerTop + 12, {
      width: PAGE.CONTENT_WIDTH,
      align: "right",
    });

  // Divider
  const dividerY = headerTop + logoSize + 8;
  doc
    .moveTo(PAGE.MARGIN, dividerY)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, dividerY)
    .lineWidth(2)
    .strokeColor(COLORS.primary)
    .stroke()
    .lineWidth(1)
    .strokeColor(COLORS.border);

  // Set y position below header
  doc.y = dividerY + 15;

  doc.restore();
};

const drawFooter = (ctx: PDFContext) => {
  const { doc } = ctx;
  const footerY = PAGE.HEIGHT - 60;

  // This must NOT affect doc.y for content flow
  doc.save();

  doc
    .moveTo(PAGE.MARGIN, footerY)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, footerY)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc.fontSize(7).font(FONTS.regular).fillColor(COLORS.gray);

  doc.text(
    "© 2026 Corporate Affairs Commission • Official Document",
    PAGE.MARGIN,
    footerY + 6,
    { width: 200, align: "left", lineBreak: false },
  );

  doc.text(`Page {{page}} of {{pages}}`, PAGE.MARGIN, footerY + 6, {
    width: PAGE.CONTENT_WIDTH,
    align: "center",
    lineBreak: false,
  });

  doc.restore();
};

// ============================================================================
// SECTION TITLE
// ============================================================================

const drawSectionTitle = (ctx: PDFContext, title: string) => {
  const { doc } = ctx;
  const requiredHeight = 30;

  ensureSpace(ctx, requiredHeight);

  doc.moveDown(0.5);

  // Green accent bar
  doc.rect(PAGE.MARGIN, doc.y, 4, 18).fillColor(COLORS.primary).fill();

  doc
    .fontSize(13)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(title, PAGE.MARGIN + 12, doc.y - 2);

  doc.moveDown(0.3);
};

// ============================================================================
// DYNAMIC TABLE COMPONENT
// ============================================================================

interface TableOptions {
  headerColor?: string;
  fontSize?: number;
  cellPadding?: number;
  rowPadding?: number;
  headerHeight?: number;
}

const drawTable = (
  ctx: PDFContext,
  columns: TableColumn[],
  rows: string[][],
  options: TableOptions = {},
): number => {
  const { doc } = ctx;
  const {
    headerColor = COLORS.tableHeader,
    fontSize = 8,
    cellPadding = 6,
    rowPadding = 3,
    headerHeight = 22,
  } = options;

  // Sanitize rows - ensure all cells are strings
  const sanitizedRows = rows.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return "";
      if (typeof cell === "string") return cell;
      if (typeof cell === "object") return JSON.stringify(cell);
      return String(cell);
    }),
  );

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const startX = PAGE.MARGIN;

  // Calculate dynamic row heights using heightOfString
  const calculateRowHeight = (row: string[]): number => {
    let maxHeight = 16; // Minimum height
    try {
      row.forEach((cell, colIdx) => {
        if (!cell) return; // Skip empty cells
        const col = columns[colIdx];
        const textWidth = col.width - cellPadding * 2;
        const textHeight = doc.heightOfString(cell.substring(0, 1000), {
          width: textWidth,
          align: col.align || "left",
        });
        maxHeight = Math.max(maxHeight, Math.min(textHeight, 100)); // Cap max height
      });
    } catch (err) {
      // Fallback if height calculation fails
      maxHeight = 20;
    }
    return maxHeight + rowPadding * 2;
  };

  // Ensure space for header + at least 2 rows
  const estimatedHeight =
    headerHeight +
    (sanitizedRows.length > 0 ? calculateRowHeight(sanitizedRows[0]) * 2 : 40);
  ensureSpace(ctx, estimatedHeight);

  const startY = doc.y;
  let currentY = startY;

  // --- Draw header ---
  doc
    .rect(startX, currentY, totalWidth, headerHeight)
    .fillColor(headerColor)
    .fill();

  columns.forEach((col, colIdx) => {
    const x =
      startX + columns.slice(0, colIdx).reduce((sum, c) => sum + c.width, 0);
    doc
      .fontSize(fontSize)
      .font(FONTS.bold)
      .fillColor(COLORS.white)
      .text(
        col.header.toUpperCase(),
        x + cellPadding,
        currentY + (headerHeight - fontSize - 2) / 2,
        {
          width: col.width - cellPadding * 2,
          align: col.align || "left",
          lineBreak: false,
        },
      );
  });

  currentY += headerHeight;

  // --- Draw rows ---
  sanitizedRows.forEach((row, rowIdx) => {
    const rowHeight = calculateRowHeight(row);

    // Page break check
    if (currentY + rowHeight > PAGE.HEIGHT - PAGE.FOOTER_MARGIN) {
      doc.addPage();
      drawHeader(ctx);
      currentY = doc.y;

      // Repeat header
      doc
        .rect(startX, currentY, totalWidth, headerHeight)
        .fillColor(headerColor)
        .fill();

      columns.forEach((col, colIdx) => {
        const x =
          startX +
          columns.slice(0, colIdx).reduce((sum, c) => sum + c.width, 0);
        doc
          .fontSize(fontSize)
          .font(FONTS.bold)
          .fillColor(COLORS.white)
          .text(
            col.header.toUpperCase(),
            x + cellPadding,
            currentY + (headerHeight - fontSize - 2) / 2,
            {
              width: col.width - cellPadding * 2,
              align: col.align || "left",
              lineBreak: false,
            },
          );
      });

      currentY += headerHeight;
    }

    // Zebra striping
    if (rowIdx % 2 === 1) {
      doc
        .rect(startX, currentY, totalWidth, rowHeight)
        .fillColor(COLORS.tableStripe)
        .fill();
    }

    // Row bottom border
    doc
      .moveTo(startX, currentY + rowHeight)
      .lineTo(startX + totalWidth, currentY + rowHeight)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    // Cell content
    columns.forEach((col, colIdx) => {
      const x =
        startX + columns.slice(0, colIdx).reduce((sum, c) => sum + c.width, 0);
      const cellValue = (row[colIdx] || "").substring(0, 500); // Limit cell content length

      try {
        doc
          .fontSize(fontSize)
          .font(colIdx === 0 ? FONTS.bold : FONTS.regular)
          .fillColor(COLORS.dark)
          .text(cellValue, x + cellPadding, currentY + rowPadding, {
            width: col.width - cellPadding * 2,
            align: col.align || "left",
            height: rowHeight - rowPadding * 2,
          });
      } catch (err) {
        // If text rendering fails, skip it
        console.warn(`Failed to render cell: ${cellValue}`, err);
      }
    });

    currentY += rowHeight;
  });

  // Update doc.y to after the table
  doc.y = currentY + 8;
  return doc.y;
};

// ============================================================================
// SUMMARY CARD GRID
// ============================================================================

const drawCardGrid = (ctx: PDFContext, cards: CardItem[]): number => {
  const { doc } = ctx;

  const cardWidth = 150;
  const cardHeight = 55;
  const cardGap = 12;
  const cardsPerRow = 3;
  const totalRowWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * cardGap;
  const startX = PAGE.MARGIN + (PAGE.CONTENT_WIDTH - totalRowWidth) / 2;

  const rowCount = Math.ceil(cards.length / cardsPerRow);
  const gridHeight = rowCount * (cardHeight + cardGap);

  ensureSpace(ctx, gridHeight + 10);

  const startY = doc.y + 5;

  cards.forEach((card, idx) => {
    const col = idx % cardsPerRow;
    const row = Math.floor(idx / cardsPerRow);
    const x = startX + col * (cardWidth + cardGap);
    const y = startY + row * (cardHeight + cardGap);

    // Card background
    doc
      .roundedRect(x, y, cardWidth, cardHeight, 8)
      .fillColor(COLORS.accent)
      .fill();

    // Left accent bar
    doc.rect(x, y, 3, cardHeight).fillColor(card.color).fill();

    // Label
    doc
      .fontSize(7)
      .font(FONTS.regular)
      .fillColor(COLORS.gray)
      .text(card.label.toUpperCase(), x + 12, y + 10, {
        width: cardWidth - 18,
        lineBreak: false,
      });

    // Value
    doc
      .fontSize(14)
      .font(FONTS.bold)
      .fillColor(COLORS.dark)
      .text(card.value, x + 12, y + 25, {
        width: cardWidth - 18,
        lineBreak: false,
      });
  });

  doc.y = startY + gridHeight + 10;
  return doc.y;
};

// ============================================================================
// CASE BLOCK COMPONENT
// ============================================================================

const drawCaseBlock = (
  ctx: PDFContext,
  caseData: ReportOptions["cases"][0],
  _index: number,
) => {
  const { doc } = ctx;

  // Estimate required height
  const estimatedHeight = 200 + caseData.complianceItems.length * 25;
  ensureSpace(ctx, estimatedHeight);

  const startY = doc.y;

  // --- Case header bar ---
  const statusColor = getStatusColor(caseData.status);
  const headerHeight = 28;

  doc
    .roundedRect(PAGE.MARGIN, startY, PAGE.CONTENT_WIDTH, headerHeight, 6)
    .fillColor(COLORS.lightGray)
    .fill();

  // Case number
  doc
    .fontSize(10)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(`Case #${caseData.id}`, PAGE.MARGIN + 12, startY + 5, {
      width: 120,
      lineBreak: false,
    });

  // Status badge
  const badgeX = PAGE.MARGIN + 150;
  const badgeWidth = 100;
  doc.save();
  doc
    .roundedRect(badgeX, startY + 6, badgeWidth, 16, 4)
    .fillColor(statusColor)
    .fillOpacity(0.15)
    .fill()
    .fillOpacity(1);

  doc
    .fontSize(7)
    .font(FONTS.bold)
    .fillColor(statusColor)
    .text(
      caseData.status.toUpperCase().replace(/_/g, " "),
      badgeX + 4,
      startY + 9,
      { width: badgeWidth - 8, align: "center", lineBreak: false },
    );
  doc.restore();

  // Company name (right-aligned)
  doc
    .fontSize(9)
    .font(FONTS.regular)
    .fillColor(COLORS.dark)
    .text(caseData.companyName, PAGE.MARGIN + 260, startY + 5, {
      width: PAGE.CONTENT_WIDTH - 260,
      align: "right",
      lineBreak: false,
    });

  doc.y = startY + headerHeight + 10;

  // --- Case info grid ---
  const infoLabels = [
    "RC Number",
    "State",
    "Created",
    "Resolved",
    "Total Penalty",
    "Amount Paid",
  ];
  const infoValues = [
    caseData.rcNumber || "N/A",
    caseData.state,
    formatDate(caseData.createdAt),
    caseData.resolvedAt ? formatDate(caseData.resolvedAt) : "Pending",
    formatCurrency(caseData.totalPenalty),
    formatCurrency(caseData.totalPaid),
  ];

  const infoColCount = 3;
  const infoColWidth = PAGE.CONTENT_WIDTH / infoColCount;

  let infoY = doc.y;
  const infoRowCount = Math.ceil(infoLabels.length / infoColCount);
  const infoRowHeight = 28;

  for (let i = 0; i < infoRowCount; i++) {
    for (let j = 0; j < infoColCount; j++) {
      const idx = i * infoColCount + j;
      if (idx >= infoLabels.length) break;

      const x = PAGE.MARGIN + j * infoColWidth;

      // Header
      doc
        .fontSize(6)
        .font(FONTS.regular)
        .fillColor(COLORS.gray)
        .text(infoLabels[idx].toUpperCase(), x, infoY, {
          width: infoColWidth - 5,
          lineBreak: false,
        });

      // Value
      doc
        .fontSize(8)
        .font(FONTS.bold)
        .fillColor(COLORS.dark)
        .text(infoValues[idx], x, infoY + 11, {
          width: infoColWidth - 5,
          lineBreak: false,
        });
    }
    infoY += infoRowHeight;
  }

  doc.y = infoY + 5;

  // --- Compliance Items Sub-table ---
  if (caseData.complianceItems.length > 0) {
    doc
      .fontSize(9)
      .font(FONTS.bold)
      .fillColor(COLORS.dark)
      .text("Compliance Items", PAGE.MARGIN, doc.y, { lineBreak: false });

    doc.moveDown(0.8);

    const compColumns: TableColumn[] = [
      { header: "Section", width: 60 },
      { header: "Title", width: 230 },
      { header: "Status", width: 70 },
      { header: "Payable", width: 70 },
      { header: "Paid", width: 65 },
    ];

    const compRows = caseData.complianceItems.map((item) => [
      item.sectionCode,
      item.sectionTitle,
      item.status.replace(/_/g, " "),
      formatCurrency(item.totalPayable),
      formatCurrency(item.amountPaid),
    ]);

    drawTable(ctx, compColumns, compRows, {
      headerColor: COLORS.primary,
      fontSize: 7,
      cellPadding: 4,
    });
  }

  doc.y += 5;
  return doc.y;
};

// ============================================================================
// MAIN PDF GENERATOR
// ============================================================================

const generatePDF = (options: ReportOptions): Readable => {
  const doc = new PDFDocument({
    margin: PAGE.MARGIN,
    bufferPages: true,
    size: "A4",
  });

  const chunks: Buffer[] = [];
  const stream = new Readable({ read() {} });

  doc.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
    stream.push(chunk);
  });

  doc.on("end", () => {
    stream.push(null);
  });

  // Register Unicode fonts
  registerFonts(doc);

  const refNumber = `REF-CAC-${Date.now().toString(36).toUpperCase()}`;

  const ctx: PDFContext = {
    doc,
    refNumber,
    reportTitle: options.title.toUpperCase(),
    reportSubtitle: `Period: ${formatDate(options.startDate)} — ${formatDate(options.endDate)}`,
    options,
  };

  // Add page event listener for footers
  let pageCount = 1;
  doc.on("pageAdded", () => {
    pageCount++;
    drawFooter(ctx);
  });

  // ============ FIRST PAGE ============
  drawHeader(ctx);
  drawFooter(ctx);

  // Report Title
  doc
    .fontSize(20)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(options.title.toUpperCase(), { align: "center" })
    .moveDown(0.3);

  // Report metadata
  doc
    .fontSize(9)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text(ctx.reportSubtitle, { align: "center" })
    .text(`Generated By: ${options.generatedBy}`, { align: "center" })
    .text(
      `Report Type: ${options.reportType === "overall" ? "Overall Compliance" : "Cases Report"}`,
      { align: "center" },
    )
    .moveDown(1);

  // Separator
  doc
    .moveTo(PAGE.MARGIN, doc.y)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, doc.y)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke()
    .moveDown(0.8);

  // ============ EXECUTIVE SUMMARY ============
  drawSectionTitle(ctx, "Executive Summary");

  const summaryCards: CardItem[] = [
    {
      label: "Total Cases",
      value: options.summary.totalCases.toString(),
      color: COLORS.primary,
    },
    {
      label: "Resolved Cases",
      value: options.summary.resolvedCases.toString(),
      color: COLORS.primaryLight,
    },
    {
      label: "Pending Cases",
      value: options.summary.pendingCases.toString(),
      color: COLORS.warning,
    },
    {
      label: "Total Penalty",
      value: formatCurrency(options.summary.totalPenalty),
      color: COLORS.primary,
    },
    {
      label: "Total Paid",
      value: formatCurrency(options.summary.totalPaid),
      color: COLORS.primaryLight,
    },
    {
      label: "Outstanding",
      value: formatCurrency(options.summary.outstandingBalance),
      color: COLORS.danger,
    },
  ];

  drawCardGrid(ctx, summaryCards);

  // ============ CASE DETAILS ============
  if (options.cases.length > 0) {
    ensureSpace(ctx, 100);
    doc.addPage();
    drawHeader(ctx);

    drawSectionTitle(ctx, "Case Details");

    options.cases.forEach((caseData, idx) => {
      drawCaseBlock(ctx, caseData, idx);

      // Case separator (except after last case)
      if (idx < options.cases.length - 1) {
        ensureSpace(ctx, 20);
        doc
          .moveTo(PAGE.MARGIN, doc.y)
          .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, doc.y)
          .strokeColor(COLORS.border)
          .lineWidth(0.5)
          .stroke()
          .moveDown(0.8);
      }
    });
  } else {
    ensureSpace(ctx, 40);
    doc
      .fontSize(10)
      .font(FONTS.regular)
      .fillColor(COLORS.gray)
      .text("No cases found for the specified criteria.", PAGE.MARGIN, doc.y, {
        align: "center",
      });
  }

  // ============ DISCLAIMER ============
  ensureSpace(ctx, 60);
  doc.moveDown(1);
  doc
    .moveTo(PAGE.MARGIN, doc.y)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, doc.y)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.5);

  doc
    .fontSize(7)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text(
      "This is an official document generated by the Corporate Affairs Commission Compliance Management System. " +
        "The information contained herein is confidential and intended solely for authorized personnel. " +
        "Unauthorized distribution or reproduction of this document is strictly prohibited.",
      { align: "center", width: PAGE.CONTENT_WIDTH },
    );

  doc.end();
  return stream;
};

export default generatePDF;
