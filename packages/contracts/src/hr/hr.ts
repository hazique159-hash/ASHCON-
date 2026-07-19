import { z } from "zod";

export const LEAVE_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKEND",
  "REMOTE",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const optionalText = (max: number) => z.string().trim().max(max).optional();
const requiredDate = (message: string) =>
  z.string().trim().min(1, message).regex(DATE_PATTERN, "Use the date picker (YYYY-MM-DD)");

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string().trim().min(1, "Select an employee"),
    leaveTypeId: z.string().trim().min(1, "Select a leave type"),
    startDate: requiredDate("Start date is required"),
    endDate: requiredDate("End date is required"),
    isHalfDay: z.boolean().optional(),
    reason: z.string().trim().min(1, "A reason is required").max(300),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before the start date",
      });
    }
    // A half day only makes sense on a single-day request.
    if (value.isHalfDay && value.endDate !== value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["isHalfDay"],
        message: "A half day must start and end on the same date",
      });
    }
  });

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const decideLeaveSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: optionalText(300),
});
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;

export const markAttendanceSchema = z.object({
  employeeId: z.string().trim().min(1, "Select an employee"),
  date: requiredDate("Date is required"),
  status: z.enum(ATTENDANCE_STATUSES),
  checkIn: optionalText(5),
  checkOut: optionalText(5),
  notes: optionalText(200),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const createHolidaySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  date: requiredDate("Date is required"),
  description: optionalText(200),
});
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

// ── Responses ───────────────────────────────────────────────────────────────

export interface LeaveRequestItem {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveType: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  days: string;
  isHalfDay: boolean;
  reason: string;
  status: LeaveStatus;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface LeaveBalanceItem {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveType: string;
  year: number;
  entitled: string;
  carried: string;
  taken: string;
  available: string;
}

export interface AttendanceItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: string | null;
  notes: string | null;
}

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  description: string | null;
  isRecurring: boolean;
}

export interface HrReference {
  employees: { id: string; name: string; employeeCode: string }[];
  leaveTypes: { id: string; code: string; name: string; daysPerYear: string; isPaid: boolean }[];
}

/** Preview of the working-day computation before a request is submitted. */
export interface LeaveDayPreview {
  workingDays: string;
  weekendDays: number;
  holidayDays: number;
  holidaysHit: { date: string; name: string }[];
}
