"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const reports_controller_1 = require("./reports.controller");
const router = (0, express_1.Router)();
router.get("/generate", auth_middleware_1.authenticate, reports_controller_1.generateReport);
router.get("/preview", auth_middleware_1.authenticate, reports_controller_1.getReportPreview);
exports.default = router;
