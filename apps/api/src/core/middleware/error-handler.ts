import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, ValidationError } from "../errors";
import { toFieldErrors } from "./validate";
import { logger } from "../logger";

/** Consistent error envelope for every API response. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Services may parse with zod directly (e.g. dynamically-dispatched
  // collections); map those to the same 422 shape as the validate middleware.
  if (err instanceof ZodError) {
    const mapped = new ValidationError(toFieldErrors(err));
    res.status(mapped.status).json({
      success: false,
      error: { code: mapped.code, message: mapped.message, details: mapped.details },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error({ err }, "Application error");
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? undefined },
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  });
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found." },
  });
};
