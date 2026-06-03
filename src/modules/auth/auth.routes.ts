import { Router } from "express";
import {
  login,
  registerUser,
  fetchUsers,
  fetchUserById,
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
router.get("/users/:id", authenticate, fetchUserById);
router.delete("/users/:id", authenticate, removeUser);

router.post("/bootstrap-super-admin", createSuperAdmin);

export default router;
