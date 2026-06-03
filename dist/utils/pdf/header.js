"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawHeader = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const constants_1 = require("./constants");
const drawLogo = (doc, x, y, size = 42) => {
    try {
        const logoPath = path_1.default.join(process.cwd(), "public", "assets", "logo.png");
        if (fs_1.default.existsSync(logoPath)) {
            doc.image(logoPath, x, y, { width: size, height: size });
            return;
        }
    }
    catch {
        // Fall through
    }
    // Fallback logo (no save/restore needed since we use absolute coords)
    doc
        .roundedRect(x, y, size, size, 10)
        .fillColor(constants_1.COLORS.primaryLight)
        .fillOpacity(0.15)
        .fill()
        .fillOpacity(1);
    const innerPadding = 5;
    const innerSize = size - innerPadding * 2;
    doc
        .roundedRect(x + innerPadding, y + innerPadding, innerSize, innerSize, 8)
        .fillColor(constants_1.COLORS.primary)
        .fill();
    doc
        .fontSize(size * 0.32)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.white)
        .text("CAC", x + innerPadding, y + innerPadding + innerSize * 0.22, {
        width: innerSize,
        align: "center",
    });
};
const drawHeader = (doc, reportTitle) => {
    const logoSize = 42;
    const logoX = constants_1.PAGE.MARGIN;
    const logoY = constants_1.PAGE.MARGIN - 8;
    const textX = logoX + logoSize + 14;
    const rightColX = constants_1.PAGE.MARGIN + constants_1.PAGE.CONTENT_WIDTH - 180;
    drawLogo(doc, logoX, logoY, logoSize);
    doc
        .fontSize(15)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.primary)
        .text("Corporate Affairs Commission", textX, logoY + 2, {
        width: constants_1.PAGE.CONTENT_WIDTH - logoSize - 200,
        lineBreak: true,
    });
    doc
        .fontSize(7)
        .font(constants_1.FONTS.regular)
        .fillColor(constants_1.COLORS.gray)
        .text("Compliance Management System", textX, logoY + 24);
    const refNumber = `REF-CAC-${Date.now().toString(36).toUpperCase().slice(0, 8)}`;
    doc
        .fontSize(7)
        .font(constants_1.FONTS.regular)
        .fillColor(constants_1.COLORS.gray)
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
        .moveTo(constants_1.PAGE.MARGIN, dividerY)
        .lineTo(constants_1.PAGE.MARGIN + constants_1.PAGE.CONTENT_WIDTH, dividerY)
        .lineWidth(2)
        .strokeColor(constants_1.COLORS.primary)
        .stroke()
        .lineWidth(1);
    doc
        .fontSize(9)
        .font(constants_1.FONTS.bold)
        .fillColor(constants_1.COLORS.dark)
        .text(reportTitle.toUpperCase(), constants_1.PAGE.MARGIN, dividerY + 10, {
        width: constants_1.PAGE.CONTENT_WIDTH,
        align: "right",
        lineBreak: false,
    });
    doc.y = dividerY + 32;
};
exports.drawHeader = drawHeader;
