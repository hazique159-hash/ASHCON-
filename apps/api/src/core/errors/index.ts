/** Base application error. The error middleware maps these to the API envelope. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, message, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Invalid email or password.") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(permission?: string) {
    super(
      403,
      permission ? `Missing permission: ${permission}` : "You do not have access to this resource.",
      "FORBIDDEN",
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found.`, "NOT_FOUND");
  }
}

export class AccountLockedError extends AppError {
  constructor(until: Date) {
    super(423, `Account locked. Try again after ${until.toISOString()}.`, "ACCOUNT_LOCKED", {
      lockedUntil: until,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = "That record already exists.") {
    super(409, message, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(422, "Validation failed.", "VALIDATION_FAILED", details);
  }
}
