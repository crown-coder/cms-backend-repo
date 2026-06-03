import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { generateReport, getReportPreview } from "./reports.controller";

const router = Router();

router.get("/generate", authenticate, generateReport);
router.get("/preview", authenticate, getReportPreview);

export default router;
