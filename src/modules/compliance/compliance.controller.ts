import { Request, Response } from "express";
import * as complianceService from "./compliance.service";

export const add = async (req: any, res: Response) => {
  try {
    const result = await complianceService.addComplianceItem(
      req.user,
      Number(req.params.caseId),
      req.body,
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
