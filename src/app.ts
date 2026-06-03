import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import caseRoutes from "./modules/cases/cases.routes";
import complianceRoutes from "./modules/compliance/compliance.routes";
import complianceSectionsRoutes from "./modules/compliance-sections/complianceSections.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import twoFactorRoutes from "./modules/two-factor/twoFactor.routes";
import reportsRoutes from "./modules/reports/reports.routes";

const app = express();

app.use(
  cors({
    origin: ["https://compliance.apps.cac.gov.ng", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/compliance-sections", complianceSectionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportsRoutes);

app.get("/", (req, res) => {
  res.send("CMS Backend Running 🚀");
});

export default app;
