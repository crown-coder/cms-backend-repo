import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import caseRoutes from "./modules/cases/cases.routes";
import complianceRoutes from "./modules/compliance/compliance.routes";
import complianceSectionsRoutes from "./modules/compliance-sections/complianceSections.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

const app = express();

app.use(
  cors({
    // origin: "http://localhost:5173", // frontend
    origin: "https://compliance-management-system-update.netlify.app", // frontend production
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/compliance-sections", complianceSectionsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("CMS Backend Running 🚀");
});

export default app;
