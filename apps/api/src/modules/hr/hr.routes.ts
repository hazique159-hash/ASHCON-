import { Router } from "express";
import {
  createHolidaySchema,
  createLeaveRequestSchema,
  decideLeaveSchema,
  markAttendanceSchema,
} from "@ca/contracts";
import { authenticate } from "../../core/middleware/authenticate";
import { authorize } from "../../core/middleware/authorize";
import { validate } from "../../core/middleware/validate";
import { hrController } from "./hr.controller";

export const hrRoutes: Router = Router();

// Default-deny for the whole module; each route adds its own permission.
hrRoutes.use(authenticate);

hrRoutes.get("/reference", authorize("hr:view"), hrController.reference);

// Leave
hrRoutes.get("/leave", authorize("hr:view"), hrController.listLeave);
hrRoutes.get("/leave/preview", authorize("hr:view"), hrController.previewDays);
hrRoutes.get("/leave/balances/:employeeId", authorize("hr:view"), hrController.balances);
hrRoutes.post(
  "/leave",
  authorize("hr:create"),
  validate({ body: createLeaveRequestSchema }),
  hrController.createLeave,
);
// Approving leave consumes entitlement — an approval-level action.
hrRoutes.post(
  "/leave/:id/decide",
  authorize("hr:approve"),
  validate({ body: decideLeaveSchema }),
  hrController.decideLeave,
);

// Attendance
hrRoutes.get("/attendance", authorize("hr:view"), hrController.listAttendance);
hrRoutes.post(
  "/attendance",
  authorize("hr:create"),
  validate({ body: markAttendanceSchema }),
  hrController.markAttendance,
);

// Holiday calendar
hrRoutes.get("/holidays", authorize("hr:view"), hrController.listHolidays);
hrRoutes.post(
  "/holidays",
  authorize("hr:create"),
  validate({ body: createHolidaySchema }),
  hrController.createHoliday,
);
