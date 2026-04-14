import { Request, Response } from "express";
import * as service from "./complianceSections.service";

export const getAll = async (_req: Request, res: Response) => {
  const sections = await service.getSections();
  res.json(sections);
};

export const create = async (req: any, res: Response) => {
  try {
    const result = await service.createSection(req.user, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
