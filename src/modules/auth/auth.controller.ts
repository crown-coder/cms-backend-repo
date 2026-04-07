import { Request, Response } from "express";
import {
  loginUser,
  createUser,
  getAllUsers,
  bootstrapSuperAdmin,
  deleteUser,
} from "./auth.service";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const registerUser = async (req: any, res: Response) => {
  try {
    const user = await createUser(req.user, req.body);

    res.json({ message: "User created successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const fetchUsers = async (req: any, res: Response) => {
  try {
    const users = await getAllUsers(req.user);
    res.json(users);
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
};

export const createSuperAdmin = async (req: Request, res: Response) => {
  try {
    const result = await bootstrapSuperAdmin(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeUser = async (req: any, res: Response) => {
  try {
    const result = await deleteUser(req.user, Number(req.params.id));

    res.json(result);
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
};
