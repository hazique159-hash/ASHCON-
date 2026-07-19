import type { NextFunction, Request, Response } from "express";
import type { CreateUserInput } from "@ca/contracts";
import { usersService } from "./users.service";

export const usersController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usersService.list();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async reference(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usersService.reference();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await usersService.create(req.body as CreateUserInput, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
