import { Router } from "express";
import * as controller from "./cases.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, controller.create);
router.get("/", authenticate, controller.getAll);
router.patch("/:id/resolve", authenticate, controller.resolve);
router.get("/:id", authenticate, controller.getOne);

export default router;
