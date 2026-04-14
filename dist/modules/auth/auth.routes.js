"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.login);
// Protected route
router.post("/create-user", auth_middleware_1.authenticate, auth_controller_1.registerUser);
router.get("/users", auth_middleware_1.authenticate, auth_controller_1.fetchUsers);
router.delete("/users/:id", auth_middleware_1.authenticate, auth_controller_1.removeUser);
router.post("/bootstrap-super-admin", auth_controller_1.createSuperAdmin);
exports.default = router;
