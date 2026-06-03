"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const cases_routes_1 = __importDefault(require("./modules/cases/cases.routes"));
const compliance_routes_1 = __importDefault(require("./modules/compliance/compliance.routes"));
const complianceSections_routes_1 = __importDefault(require("./modules/compliance-sections/complianceSections.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const payments_routes_1 = __importDefault(require("./modules/payments/payments.routes"));
const twoFactor_routes_1 = __importDefault(require("./modules/two-factor/twoFactor.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["https://compliance.apps.cac.gov.ng", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
app.use(express_1.default.json());
app.use("/api/auth", auth_routes_1.default);
app.use("/api/2fa", twoFactor_routes_1.default);
app.use("/api/cases", cases_routes_1.default);
app.use("/api/compliance", compliance_routes_1.default);
app.use("/api/compliance-sections", complianceSections_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/payments", payments_routes_1.default);
app.use("/api/reports", reports_routes_1.default);
app.get("/", (req, res) => {
    res.send("CMS Backend Running 🚀");
});
exports.default = app;
