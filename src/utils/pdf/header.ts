// header.ts
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { PAGE, COLORS, FONTS } from "./constants";

const drawLogo = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size: number = 42,
): void => {
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, x, y, { width: size, height: size });
      return;
    }
  } catch {
    // Fall through
  }

  // Fallback logo (no save/restore needed since we use absolute coords)
  doc
    .roundedRect(x, y, size, size, 10)
    .fillColor(COLORS.primaryLight)
    .fillOpacity(0.15)
    .fill()
    .fillOpacity(1);

  const innerPadding = 5;
  const innerSize = size - innerPadding * 2;
  doc
    .roundedRect(x + innerPadding, y + innerPadding, innerSize, innerSize, 8)
    .fillColor(COLORS.primary)
    .fill();

  doc
    .fontSize(size * 0.32)
    .font(FONTS.bold)
    .fillColor(COLORS.white)
    .text("CAC", x + innerPadding, y + innerPadding + innerSize * 0.22, {
      width: innerSize,
      align: "center",
    });
};

export const drawHeader = (
  doc: PDFKit.PDFDocument,
  reportTitle: string,
): void => {
  const logoSize = 42;
  const logoX = PAGE.MARGIN;
  const logoY = PAGE.MARGIN - 8;
  const textX = logoX + logoSize + 14;
  const rightColX = PAGE.MARGIN + PAGE.CONTENT_WIDTH - 180;

  drawLogo(doc, logoX, logoY, logoSize);

  doc
    .fontSize(15)
    .font(FONTS.bold)
    .fillColor(COLORS.primary)
    .text("Corporate Affairs Commission", textX, logoY + 2, {
      width: PAGE.CONTENT_WIDTH - logoSize - 200,
      lineBreak: true,
    });

  doc
    .fontSize(7)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text("Compliance Management System", textX, logoY + 24);

  const refNumber = `REF-CAC-${Date.now().toString(36).toUpperCase().slice(0, 8)}`;

  doc
    .fontSize(7)
    .font(FONTS.regular)
    .fillColor(COLORS.gray)
    .text(`Reference: ${refNumber}`, rightColX, logoY + 2, {
      width: 180,
      align: "right",
      lineBreak: false,
    })
    .text("Confidential", rightColX, logoY + 14, {
      width: 180,
      align: "right",
      lineBreak: false,
    });

  const dividerY = logoY + logoSize + 10;

  doc
    .moveTo(PAGE.MARGIN, dividerY)
    .lineTo(PAGE.MARGIN + PAGE.CONTENT_WIDTH, dividerY)
    .lineWidth(2)
    .strokeColor(COLORS.primary)
    .stroke()
    .lineWidth(1);

  doc
    .fontSize(9)
    .font(FONTS.bold)
    .fillColor(COLORS.dark)
    .text(reportTitle.toUpperCase(), PAGE.MARGIN, dividerY + 10, {
      width: PAGE.CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });

  doc.y = dividerY + 32;
};
