import { Router } from "express";
import {
  login,
  registerUser,
  fetchUsers,
  createSuperAdmin,
  removeUser,
  updatePassword,
} from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/login", login);

// Protected route
router.post("/create-user", authenticate, registerUser);
router.post("/update-password", authenticate, updatePassword);
router.get("/users", authenticate, fetchUsers);
router.delete("/users/:id", authenticate, removeUser);

router.post("/bootstrap-super-admin", createSuperAdmin);

export default router;
