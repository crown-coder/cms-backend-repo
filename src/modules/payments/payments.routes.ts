import { Router } from "express";
import * as controller from "./payments.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

// Record a payment for a case
router.post("/:caseId/record", authenticate, controller.recordPayment);

// Get all payments for a case
router.get("/:caseId", authenticate, controller.getPayments);

export default router;
