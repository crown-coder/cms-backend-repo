import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { otpRateLimit } from "../../middleware/otpRateLimit.middleware";
import {
  beginSetup,
  verifySetup,
  verifyLogin,
  disable,
  reset,
} from "./twoFactor.controller";

const router = Router();

router.post("/setup", authenticate, beginSetup);
router.post("/verify", authenticate, otpRateLimit, verifySetup);
router.post("/login", otpRateLimit, verifyLogin);
router.post("/disable", authenticate, otpRateLimit, disable);
router.post("/reset", authenticate, otpRateLimit, reset);

export default router;
