"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluralize = exports.calculateResolutionRate = exports.drawSectionTitle = exports.drawSeparator = exports.hasPageSpace = exports.ensurePageSpace = exports.getStatusLabel = exports.getStatusBgColor = exports.getStatusColor = exports.formatShortDate = exports.formatDate = exports.formatNumber = exports.formatCurrencyWithSymbol = exports.formatCurrency = void 0;
const constants_1 = require("./constants");
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
const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num) || num === 0)
        return "NGN 0";
    // Use "NGN" prefix with locale formatting
    // This renders correctly in all PDF fonts
    return `NGN ${num.toLocaleString("en-NG")}`;
};
exports.formatCurrency = formatCurrency;
/**
 * Alternative: If you have registered a Unicode font (e.g., DejaVu Sans),
 * use this version instead. Rename to formatCurrency and remove the above.
 */
const formatCurrencyWithSymbol = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num) || num === 0)
        return "₦0";
    // The ₦ symbol requires a Unicode-compatible font
    // Register DejaVuSans in your reportGenerator before using this
    return `₦${num.toLocaleString("en-NG")}`;
};
exports.formatCurrencyWithSymbol = formatCurrencyWithSymbol;
const formatNumber = (value) => {
    const num = typeof value === "string" ? parseInt(value, 10) : value;
    if (isNaN(num))
        return "0";
    return num.toLocaleString("en-NG");
};
exports.formatNumber = formatNumber;
// ============================================================================
// DATE FORMATTING
// ============================================================================
const formatDate = (date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return "N/A";
    return d.toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};
exports.formatDate = formatDate;
const formatShortDate = (date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return "N/A";
    return d.toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};
exports.formatShortDate = formatShortDate;
// ============================================================================
// STATUS HELPERS
// ============================================================================
const getStatusColor = (status) => {
    const colors = {
        resolved: constants_1.COLORS.success,
        pending: constants_1.COLORS.warning,
        in_progress: constants_1.COLORS.info,
        escalated: constants_1.COLORS.purple,
        suspended: constants_1.COLORS.gray,
        compliant: constants_1.COLORS.success,
        non_compliant: constants_1.COLORS.danger,
    };
    return colors[status] || constants_1.COLORS.gray;
};
exports.getStatusColor = getStatusColor;
const getStatusBgColor = (status) => {
    const colors = {
        resolved: constants_1.COLORS.successLight,
        pending: constants_1.COLORS.warningLight,
        in_progress: constants_1.COLORS.infoLight,
        escalated: constants_1.COLORS.purpleLight,
        suspended: constants_1.COLORS.lighterGray,
        compliant: constants_1.COLORS.successLight,
        non_compliant: constants_1.COLORS.dangerLight,
    };
    return colors[status] || constants_1.COLORS.lighterGray;
};
exports.getStatusBgColor = getStatusBgColor;
const getStatusLabel = (status) => {
    return status.replace(/_/g, " ").toUpperCase();
};
exports.getStatusLabel = getStatusLabel;
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
const ensurePageSpace = (doc, heightNeeded, drawHeaderFn, headerTitle) => {
    const remainingSpace = constants_1.PAGE.HEIGHT - constants_1.PAGE.FOOTER_MARGIN - doc.y;
    // Only add a page if we REALLY need one
    // Add a small buffer (10pt) to avoid edge cases
    if (remainingSpace < heightNeeded + 10) {
        doc.addPage();
        drawHeaderFn(doc, headerTitle || "");
    }
};
exports.ensurePageSpace = ensurePageSpace;
/**
 * Returns true if there's enough space, false otherwise.
 * Does NOT modify the document.
 */
const hasPageSpace = (doc, heightNeeded) => {
    const remainingSpace = constants_1.PAGE.HEIGHT - constants_1.PAGE.FOOTER_MARGIN - doc.y;
    return remainingSpace >= heightNeeded + 10;
};
exports.hasPageSpace = hasPageSpace;
// ============================================================================
// DRAWING HELPERS
// ============================================================================
const drawSeparator = (doc, color) => {
    // Don't draw separator if we're at the very bottom
    if (doc.y > constants_1.PAGE.HEIGHT - constants_1.PAGE.FOOTER_MARGIN - 30) {
        return;
    }
    doc
        .moveTo(constants_1.PAGE.MARGIN, doc.y)
        .lineTo(constants_1.PAGE.MARGIN + constants_1.PAGE.CONTENT_WIDTH, doc.y)
        .strokeColor(color || constants_1.COLORS.border)
        .lineWidth(0.5)
        .stroke()
        .moveDown(0.5);
};
exports.drawSeparator = drawSeparator;
const drawSectionTitle = (doc, title, drawHeaderFn, headerTitle) => {
    // Only check space if drawHeader function is provided
    if (drawHeaderFn) {
        (0, exports.ensurePageSpace)(doc, 35, drawHeaderFn, headerTitle);
    }
    doc.moveDown(0.5);
    // Green accent bar
    doc.rect(constants_1.PAGE.MARGIN, doc.y, 4, 18).fillColor(constants_1.COLORS.primary).fill();
    doc
        .fontSize(constants_1.FONT_SIZES.heading)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.dark)
        .text(title, constants_1.PAGE.MARGIN + 12, doc.y - 2);
    doc.moveDown(0.5);
};
exports.drawSectionTitle = drawSectionTitle;
// ============================================================================
// STATISTICS HELPERS
// ============================================================================
const calculateResolutionRate = (resolved, total) => {
    if (total <= 0)
        return 0;
    return Math.round((resolved / total) * 100);
};
exports.calculateResolutionRate = calculateResolutionRate;
const pluralize = (count, singular, plural) => {
    const word = plural || `${singular}s`;
    return `${count} ${count === 1 ? singular : word}`;
};
exports.pluralize = pluralize;
