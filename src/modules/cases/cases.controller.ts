import { Request, Response } from "express";
import * as caseService from "./cases.service";

export const create = async (req: any, res: Response) => {
  try {
    const result = await caseService.createCase(req.user, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAll = async (req: any, res: Response) => {
  try {
    const result = await caseService.getCases(req.user);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resolve = async (req: any, res: Response) => {
  try {
    const {
      resolutionType,
      remark,
      penaltyReduction,
      suspendedUntil,
      suspensionReason,
    } = req.body;

    const result = await caseService.resolveCase(
      Number(req.params.id),
      req.user,
      {
        resolutionType,
        remark,
        penaltyReduction,
        suspendedUntil,
        suspensionReason,
      },
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getOne = async (req: any, res: Response) => {
  try {
    const result = await caseService.getCaseById(
      req.user,
      Number(req.params.id),
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
