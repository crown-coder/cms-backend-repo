// helpers.ts
import PDFDocument from "pdfkit";
import { PAGE, COLORS, FONTS, FONT_SIZES } from "./constants";

// ============================================================================
// CURRENCY & NUMBER FORMATTING
// ============================================================================

/**
 * Formats a value as Nigerian Naira currency string.
 * Uses "NGN " prefix instead of ₦ symbol because Helvetica
 * does not support the Naira sign (Unicode U+20A6).
 *
 * For proper ₦ rendering, register a Unicode font like DejaVu Sans
 * and use that instead of Helvetica.
 */
export const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "NGN 0";

  // Use "NGN" prefix with locale formatting
  // This renders correctly in all PDF fonts
  return `NGN ${num.toLocaleString("en-NG")}`;
};

/**
 * Alternative: If you have registered a Unicode font (e.g., DejaVu Sans),
 * use this version instead. Rename to formatCurrency and remove the above.
 */
export const formatCurrencyWithSymbol = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "₦0";

  // The ₦ symbol requires a Unicode-compatible font
  // Register DejaVuSans in your reportGenerator before using this
  return `₦${num.toLocaleString("en-NG")}`;
};

export const formatNumber = (value: string | number): string => {
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-NG");
};

// ============================================================================
// DATE FORMATTING
// ============================================================================

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatShortDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ============================================================================
// STATUS HELPERS
// ============================================================================

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    resolved: COLORS.success,
    pending: COLORS.warning,
    in_progress: COLORS.info,
    escalated: COLORS.purple,
    suspended: COLORS.gray,
    compliant: COLORS.success,
    non_compliant: COLORS.danger,
  };
  return colors[status] || COLORS.gray;
};

export const getStatusBgColor = (status: string): string => {
  const colors: Record<string, string> = {
    resolved: COLORS.successLight,
    pending: COLORS.warningLight,
    in_progress: COLORS.infoLight,
    escalated: COLORS.purpleLight,
    suspended: COLORS.lighterGray,
    compliant: COLORS.successLight,
    non_compliant: COLORS.dangerLight,
  };
  return colors[status] || COLORS.lighterGray;
};

export const getStatusLabel = (status: string): string => {
  return status.replace(/_/g, " ").toUpperCase();
};

// ============================================================================
// PAGE LAYOUT HELPERS
// ============================================================================

/**
 * Checks if there's enough space on the current page.
 * If not, adds a new page and draws the header.
 *
 * CRITICAL: Does NOT call drawHeader if there's already enough space.
 * This prevents unnecessary page additions.
 */
export const ensurePageSpace = (
  doc: PDFKit.PDFDocument,
  heightNeeded: number,
  drawHeaderFn: Function,
  headerTitle?: string,
): void => {
  const remainingSpace = PAGE.HEIGHT - PAGE.FOOTER_MARGIN - doc.y;

  // Only add a page if we REALLY need one
  // Add a small buffer (10pt) to avoid edge cases
  if (remainingSpace < heightNeeded + 10) {
    doc.addPage();
    drawHeaderFn(doc, headerTitle || "");
  }
};

/**
 * Returns true if there's enough space, false otherwise.
 * Does NOT modify the document.
 */
export const hasPageSpace = (
  doc: PDFKit.PDFDocument,
  heightNeeded: number,
): boolean => {
  const remainingSpace = PAGE.HEIGHT - PAGE.FOOTER_MARGIN - doc.y;
  return remainingSpace >= heightNeeded + 10;
};

// ============================================================================
// DRAWING HELPERS
// ============================================================================

export const drawSeparator = (
  doc: PDFKit.PDFDocument,
  color?: string,
): void => {
  // Don't draw separator if we're at the very bottom
  if (doc.y > PAGE.HEIGHT - PAGE.FOOTER_MARGIN - 30) {
    return;
  }

  doc
    .moveTo(PAGE.MARGIN, doc.y)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, doc.y)
    .strokeColor(color || COLORS.border)
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.5);
};

export const drawSectionTitle = (
  doc: PDFKit.PDFDocument,
  title: string,
  drawHeaderFn?: Function,
  headerTitle?: string,
): void => {
  // Only check space if drawHeader function is provided
  if (drawHeaderFn) {
    ensurePageSpace(doc, 35, drawHeaderFn, headerTitle);
  }

  doc.moveDown(0.5);

  // Green accent bar
  doc.rect(PAGE.MARGIN, doc.y, 4, 18).fillColor(COLORS.primary).fill();

  doc
    .fontSize(FONT_SIZES.heading)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(title, PAGE.MARGIN + 12, doc.y - 2);

  doc.moveDown(0.5);
};

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

export const calculateResolutionRate = (
  resolved: number,
  total: number,
): number => {
  if (total <= 0) return 0;
  return Math.round((resolved / total) * 100);
};

export const pluralize = (
  count: number,
  singular: string,
  plural?: string,
): string => {
  const word = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : word}`;
};
