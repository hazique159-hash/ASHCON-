import { z } from "zod";
import { EMAIL_PATTERN } from "../common/api";

/**
 * `.trim()` normalises without changing the inferred type (still `string`), so
 * the schema stays safe for React Hook Form while tolerating the leading and
 * trailing whitespace that copy-paste and mobile autocomplete introduce.
 * Case-folding stays in the API service layer.
 *
 * Passwords are deliberately NOT trimmed — surrounding spaces can be intentional.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(160)
    .regex(EMAIL_PATTERN, "Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthRole {
  key: string;
  name: string;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  isSuperAdmin: boolean;
  roles: AuthRole[];
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
  mustChangePassword: boolean;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: PublicUser;
  isSuperAdmin: boolean;
  /** Effective permission keys, or ["*"] for a super admin. */
  permissions: string[];
}
