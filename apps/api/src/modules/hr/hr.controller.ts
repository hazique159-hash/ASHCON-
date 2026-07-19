import type { NextFunction, Request, Response } from "express";
import type {
  CreateHolidayInput,
  CreateLeaveRequestInput,
  DecideLeaveInput,
  MarkAttendanceInput,
} from "@ca/contracts";
import { BadRequestError } from "../../core/errors";
import { hrService } from "./hr.service";

const ok = (res: Response, data: unknown) => res.json({ success: true, data });

export const hrController = {
  async reference(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await hrService.reference());
    } catch (err) {
      next(err);
    }
  },

  async previewDays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start, end } = req.query;
      if (typeof start !== "string" || typeof end !== "string") {
        throw new BadRequestError("start and end query parameters are required.");
      }
      ok(res, await hrService.previewDays(start, end));
    } catch (err) {
      next(err);
    }
  },

  async listLeave(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await hrService.listLeaveRequests());
    } catch (err) {
      next(err);
    }
  },

  async balances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await hrService.balancesFor(req.params.employeeId as string));
    } catch (err) {
      next(err);
    }
  },

  async createLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hrService.createLeaveRequest(
        req.body as CreateLeaveRequestInput,
        req.user!.id,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async decideLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hrService.decideLeaveRequest(
        req.params.id as string,
        req.body as DecideLeaveInput,
        req.user!.id,
      );
      ok(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = typeof req.query.date === "string" ? req.query.date : undefined;
      ok(res, await hrService.listAttendance(date));
    } catch (err) {
      next(err);
    }
  },

  async markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hrService.markAttendance(req.body as MarkAttendanceInput, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listHolidays(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      ok(res, await hrService.listHolidays());
    } catch (err) {
      next(err);
    }
  },

  async createHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await hrService.createHoliday(req.body as CreateHolidayInput, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
