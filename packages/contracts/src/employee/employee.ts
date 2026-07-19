import { z } from "zod";
import { EMAIL_PATTERN } from "../common/api";

export const GENDERS = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;
export const MARITAL_STATUSES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNDISCLOSED"] as const;
export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "PROBATION",
  "INTERN",
  "CONSULTANT",
] as const;
export const EMPLOYEE_STATUSES = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "RESIGNED",
  "TERMINATED",
  "RETIRED",
] as const;

export type Gender = (typeof GENDERS)[number];
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** HTML date inputs submit "YYYY-MM-DD", or "" when cleared. */
const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || DATE_PATTERN.test(value), "Use the date picker (YYYY-MM-DD)")
  .optional();

const optionalText = (max: number) => z.string().trim().max(max).optional();

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || EMAIL_PATTERN.test(value), "Enter a valid email")
  .optional();

export const createEmployeeSchema = z.object({
  employeeCode: z.string().trim().min(1, "Employee code is required").max(20),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  fatherName: optionalText(80),

  dateOfBirth: optionalDate,
  gender: z.enum(GENDERS).optional(),
  maritalStatus: z.enum(MARITAL_STATUSES).optional(),
  nationality: optionalText(60),
  nationalId: optionalText(40),
  personalEmail: optionalEmail,
  personalPhone: optionalText(30),
  city: optionalText(60),
  country: optionalText(60),

  departmentId: optionalText(40),
  designationId: optionalText(40),
  branchId: optionalText(40),
  reportsToId: optionalText(40),

  employmentType: z.enum(EMPLOYMENT_TYPES),
  status: z.enum(EMPLOYEE_STATUSES),
  dateOfJoining: z
    .string()
    .trim()
    .min(1, "Date of joining is required")
    .regex(DATE_PATTERN, "Use the date picker (YYYY-MM-DD)"),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  branch: string | null;
  reportsTo: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  dateOfJoining: string;
  hasPortalAccount: boolean;
}

export interface EmployeeReference {
  departments: { id: string; name: string }[];
  designations: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  managers: { id: string; name: string; employeeCode: string }[];
}

export interface CreatedEmployee {
  id: string;
  employeeCode: string;
  name: string;
}
