import { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export const summary = async (req: any, res: Response) => {
  try {
    const data = await dashboardService.getSummary(req.user);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
