import { z } from "zod";
import { EMAIL_PATTERN } from "@ca/contracts";

/**
 * Environment contract. Validated at boot — a missing or weak secret fails fast
 * rather than starting the server in an insecure state.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  ACCESS_TTL: z.string().default("15m"),
  REFRESH_IDLE_TTL: z.string().default("8h"),
  REFRESH_ABSOLUTE_TTL: z.string().default("7d"),

  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(11),
  LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOCKOUT_DURATION: z.string().default("15m"),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).default(12),
  PASSWORD_HISTORY: z.coerce.number().int().min(0).default(5),

  /** Key material for column-level AES-GCM encryption (bank details, etc.). */
  ENCRYPTION_KEY: z.string().min(16, "ENCRYPTION_KEY must be at least 16 chars"),

  SEED_ADMIN_EMAIL: z.string().regex(EMAIL_PATTERN, "SEED_ADMIN_EMAIL must be a valid email").optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
