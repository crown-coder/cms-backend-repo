import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getAll } from "./complianceSections.controller";

const router = Router();

router.get("/", authenticate, getAll);

export default router;
