import type { NextFunction, Request, Response } from "express";
import {
  EMPLOYEE_COLLECTIONS,
  type CreateEmployeeInput,
  type EmployeeCollection,
  type MedicalInput,
  type SalaryInput,
} from "@ca/contracts";
import { BadRequestError } from "../../core/errors";
import { can } from "../../core/rbac/permissions";
import { employeeService } from "./employee.service";

function collectionParam(req: Request): EmployeeCollection {
  const value = req.params.collection as EmployeeCollection;
  if (!EMPLOYEE_COLLECTIONS.includes(value)) {
    throw new BadRequestError(`Unknown collection "${String(value)}".`);
  }
  return value;
}

export const employeeController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await employeeService.list() });
    } catch (err) {
      next(err);
    }
  },

  async reference(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await employeeService.reference() });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Compensation is only included for holders of payroll:view.
      const canViewSalary = await can(req.user!.id, "payroll:view");
      const data = await employeeService.detail(req.params.id as string, canViewSalary);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await employeeService.create(req.body as CreateEmployeeInput, req.user!.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await employeeService.update(
        req.params.id as string,
        req.body as CreateEmployeeInput,
        req.user!.id,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async addCollectionItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await employeeService.addCollectionItem(
        req.params.id as string,
        collectionParam(req),
        req.body,
        req.user!.id,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async removeCollectionItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await employeeService.removeCollectionItem(
        req.params.id as string,
        collectionParam(req),
        req.params.recordId as string,
        req.user!.id,
      );
      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  },

  async saveMedical(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await employeeService.saveMedical(
        req.params.id as string,
        req.body as MedicalInput,
        req.user!.id,
      );
      res.json({ success: true, data: { saved: true } });
    } catch (err) {
      next(err);
    }
  },

  async saveSalary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await employeeService.saveSalary(
        req.params.id as string,
        req.body as SalaryInput,
        req.user!.id,
      );
      res.json({ success: true, data: { saved: true } });
    } catch (err) {
      next(err);
    }
  },
};
