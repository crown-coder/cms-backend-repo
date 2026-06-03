"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawAllFooters = exports.drawFooter = void 0;
const constants_1 = require("./constants");
/**
 * Draws footer on the current page using ONLY absolute positioning.
 *
 * CRITICAL: This function must NOT:
 * - Call doc.save() / doc.restore()
 * - Call doc.addPage()
 * - Call doc.switchToPage()
 * - Modify doc.y
 * - Use any relative positioning
 *
 * Only absolute x,y coordinates are used to prevent any interaction
 * with PDFKit's page management system.
 */
const drawFooter = (doc) => {
    const footerTop = constants_1.PAGE.HEIGHT - 55;
    const footerMid = footerTop + 16;
    const footerBottom = footerTop + 28;
    // ── Divider line (absolute position) ─────────────────
    doc
        .moveTo(constants_1.PAGE.MARGIN, footerTop)
        .lineTo(constants_1.PAGE.MARGIN + constants_1.PAGE.CONTENT_WIDTH, footerTop)
        .strokeColor(constants_1.COLORS.border)
        .lineWidth(0.5)
        .stroke();
    // ── Left: Copyright ──────────────────────────────────
    doc
        .fontSize(6.5)
        .font(constants_1.FONTS.regular)
        .fillColor(constants_1.COLORS.gray)
        .text("© 2026 Corporate Affairs Commission", constants_1.PAGE.MARGIN, footerMid, {
        width: 200,
        align: "left",
        lineBreak: false,
    })
        .text("Official Document • Confidential", constants_1.PAGE.MARGIN, footerBottom, {
        width: 200,
        align: "left",
        lineBreak: false,
    });
    // ── Center: Classification ───────────────────────────
    doc
        .fontSize(6.5)
        .font(constants_1.FONTS.regular)
        .fillColor(constants_1.COLORS.gray)
        .text("For Authorized Personnel Only", constants_1.PAGE.MARGIN, footerMid, {
        width: constants_1.PAGE.CONTENT_WIDTH,
        align: "center",
        lineBreak: false,
    });
    // ── Right: Page number ───────────────────────────────
    doc
        .fontSize(7)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.dark)
        .text(`Page ${doc.page}`, constants_1.PAGE.MARGIN, footerMid, {
        width: constants_1.PAGE.CONTENT_WIDTH,
        align: "right",
        lineBreak: false,
    });
    // ── Right: Report ID ─────────────────────────────────
    doc
        .fontSize(6)
        .font(constants_1.FONTS.regular)
        .fillColor(constants_1.COLORS.gray)
        .text(`CAC-CMS-${new Date().getFullYear()}`, constants_1.PAGE.MARGIN, footerBottom, {
        width: constants_1.PAGE.CONTENT_WIDTH,
        align: "right",
        lineBreak: false,
    });
};
exports.drawFooter = drawFooter;
/**
 * No-op. Footers are handled exclusively by the pageAdded event.
 * Do NOT call this function.
 */
const drawAllFooters = (_doc) => {
    // Intentionally empty
};
exports.drawAllFooters = drawAllFooters;
