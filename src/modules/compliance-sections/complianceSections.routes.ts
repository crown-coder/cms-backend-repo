import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getAll, create } from "./complianceSections.controller";

const router = Router();

router.get("/", authenticate, getAll);
router.post("/", authenticate, create);

export default router;
