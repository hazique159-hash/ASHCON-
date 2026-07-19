import { z } from "zod";
import { EMAIL_PATTERN } from "../common/api";

export const createUserSchema = z.object({
  // .trim() runs before .min(), so a whitespace-only name is correctly rejected.
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(160)
    .regex(EMAIL_PATTERN, "Enter a valid email"),
  /** Optional fields arrive as "" from HTML forms; the service maps them to null. */
  employeeCode: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(30).optional(),
  departmentId: z.string().trim().max(40).optional(),
  roleId: z.string().min(1, "Select a role"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export interface UserListItem {
  id: string;
  employeeCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  department: string | null;
  designation: string | null;
  roles: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserReference {
  departments: { id: string; name: string; code: string }[];
  roles: { id: string; name: string; key: string; rank: number }[];
}

export interface CreatedUser {
  id: string;
  email: string;
  name: string;
  /** Returned once, at creation time only. */
  temporaryPassword: string;
}
