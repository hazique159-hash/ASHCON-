/** Shape every Connect Affairs endpoint responds with. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/**
 * Email validation used by every schema.
 *
 * A regex rather than zod's `.email()` so the rule is byte-identical on both
 * sides and immune to validator changes between zod releases.
 */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
