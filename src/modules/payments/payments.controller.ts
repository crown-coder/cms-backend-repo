import { Request, Response } from "express";
import * as paymentService from "./payments.service";

export const recordPayment = async (req: any, res: Response) => {
  try {
    const { amount, paymentDate } = req.body;
    const caseId = Number(req.params.caseId);

    const result = await paymentService.recordPayment(req.user, caseId, {
      amount,
      paymentDate,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getPayments = async (req: any, res: Response) => {
  try {
    const caseId = Number(req.params.caseId);

    const result = await paymentService.getPayments(caseId);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
