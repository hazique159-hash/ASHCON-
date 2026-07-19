import type { NextFunction, Request, Response } from "express";
import type { CreateAccountInput, CreateJournalInput } from "@ca/contracts";
import { financeService } from "./finance.service";

export const financeController = {
  async listAccounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await financeService.listAccounts() });
    } catch (err) {
      next(err);
    }
  },

  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await financeService.createAccount(
        req.body as CreateAccountInput,
        req.user!.id,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async reference(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await financeService.reference() });
    } catch (err) {
      next(err);
    }
  },

  async listJournal(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await financeService.listJournal() });
    } catch (err) {
      next(err);
    }
  },

  async journalDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await financeService.journalDetail(req.params.id as string) });
    } catch (err) {
      next(err);
    }
  },

  async createJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await financeService.createJournal(
        req.body as CreateJournalInput,
        req.user!.id,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async postJournal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await financeService.postJournal(req.params.id as string, req.user!.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async trialBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const asOf = typeof req.query.asOf === "string" ? req.query.asOf : undefined;
      res.json({ success: true, data: await financeService.trialBalance(asOf) });
    } catch (err) {
      next(err);
    }
  },
};
