"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const complianceSections_controller_1 = require("./complianceSections.controller");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authenticate, complianceSections_controller_1.getAll);
exports.default = router;
