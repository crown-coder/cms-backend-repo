import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import * as controller from "./compliance.controller";

const router = Router();

router.post("/:caseId", authenticate, controller.add);

export default router;
