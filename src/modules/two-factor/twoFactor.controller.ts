import { Response } from "express";
import type { AuthRequest } from "../../middleware/auth.middleware";
import {
  setupTwoFactor,
  verifyTwoFactorSetup,
  verifyTwoFactorLogin,
  disableTwoFactor,
  resetTwoFactor,
} from "./twoFactor.service";

export const beginSetup = async (req: AuthRequest, res: Response) => {
  try {
    const result = await setupTwoFactor(req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifySetup = async (req: AuthRequest, res: Response) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      throw new Error("Authentication code is required");
    }
    const result = await verifyTwoFactorSetup(req.user!.id, otp);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyLogin = async (req: AuthRequest, res: Response) => {
  try {
    const { token, otp, recoveryCode, rememberDevice } = req.body;
    if (!token) {
      throw new Error("2FA token is required");
    }
    const result = await verifyTwoFactorLogin({
      token,
      otp,
      recoveryCode,
      rememberDevice,
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const disable = async (req: AuthRequest, res: Response) => {
  try {
    const { password, otp, recoveryCode } = req.body;
    if (!password) {
      throw new Error("Password is required");
    }
    const result = await disableTwoFactor(req.user!.id, {
      password,
      otp,
      recoveryCode,
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const reset = async (req: AuthRequest, res: Response) => {
  try {
    const { password, recoveryCode } = req.body;
    if (!password || !recoveryCode) {
      throw new Error("Password and recovery code are required");
    }
    const result = await resetTwoFactor(req.user!.id, {
      password,
      recoveryCode,
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
