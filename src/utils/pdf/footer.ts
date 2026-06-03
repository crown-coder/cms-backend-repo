// footer.ts
import PDFDocument from "pdfkit";
import { PAGE, COLORS, FONTS } from "./constants";

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
export const drawFooter = (doc: PDFKit.PDFDocument): void => {
  const footerTop = PAGE.HEIGHT - 55;
  const footerMid = footerTop + 16;
  const footerBottom = footerTop + 28;

  // ── Divider line (absolute position) ─────────────────
  doc
    .moveTo(PAGE.MARGIN, footerTop)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, footerTop)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  // ── Left: Copyright ──────────────────────────────────
  doc
    .fontSize(6.5)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text("© 2026 Corporate Affairs Commission", PAGE.MARGIN, footerMid, {
      width: 200,
      align: "left",
      lineBreak: false,
    })
    .text("Official Document • Confidential", PAGE.MARGIN, footerBottom, {
      width: 200,
      align: "left",
      lineBreak: false,
    });

  // ── Center: Classification ───────────────────────────
  doc
    .fontSize(6.5)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text("For Authorized Personnel Only", PAGE.MARGIN, footerMid, {
      width: PAGE.CONTENT_WIDTH,
      align: "center",
      lineBreak: false,
    });

  // ── Right: Page number ───────────────────────────────
  doc
    .fontSize(7)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(`Page ${doc.page}`, PAGE.MARGIN, footerMid, {
      width: PAGE.CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });

  // ── Right: Report ID ─────────────────────────────────
  doc
    .fontSize(6)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text(`CAC-CMS-${new Date().getFullYear()}`, PAGE.MARGIN, footerBottom, {
      width: PAGE.CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });
};

/**
 * No-op. Footers are handled exclusively by the pageAdded event.
 * Do NOT call this function.
 */
export const drawAllFooters = (_doc: PDFKit.PDFDocument): void => {
  // Intentionally empty
};
