import { Request, Response } from "express";
import * as service from "./complianceSections.service";

export const getAll = async (_req: Request, res: Response) => {
  const sections = await service.getSections();
  res.json(sections);
};
