import { Router } from "express";
import { createEmployeeSchema, medicalSchema, salarySchema } from "@ca/contracts";
import { authenticate } from "../../core/middleware/authenticate";
import { authorize } from "../../core/middleware/authorize";
import { validate } from "../../core/middleware/validate";
import { employeeController } from "./employee.controller";

export const employeeRoutes: Router = Router();

// Default-deny: authentication plus an explicit module permission on every route.
employeeRoutes.use(authenticate);

employeeRoutes.get("/", authorize("employee:view"), employeeController.list);
employeeRoutes.get("/reference", authorize("employee:view"), employeeController.reference);
employeeRoutes.get("/:id", authorize("employee:view"), employeeController.detail);

employeeRoutes.post(
  "/",
  authorize("employee:create"),
  validate({ body: createEmployeeSchema }),
  employeeController.create,
);

employeeRoutes.patch(
  "/:id",
  authorize("employee:edit"),
  validate({ body: createEmployeeSchema }),
  employeeController.update,
);

// Generic child collections: emergency-contacts · education · experience ·
// certifications · skills. The body schema is chosen by the service.
employeeRoutes.post(
  "/:id/:collection",
  authorize("employee:edit"),
  employeeController.addCollectionItem,
);
employeeRoutes.delete(
  "/:id/:collection/:recordId",
  authorize("employee:edit"),
  employeeController.removeCollectionItem,
);

employeeRoutes.put(
  "/:id/profile/medical",
  authorize("employee:edit"),
  validate({ body: medicalSchema }),
  employeeController.saveMedical,
);

// Compensation is gated behind payroll, not employee, permissions.
employeeRoutes.put(
  "/:id/profile/salary",
  authorize("payroll:edit"),
  validate({ body: salarySchema }),
  employeeController.saveSalary,
);
