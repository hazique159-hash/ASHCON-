import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/tokens";
import { UnauthorizedError } from "../errors";

/** Verifies the Bearer access token and populates req.user. Stateless (no DB hit). */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(new UnauthorizedError("Authentication required."));
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, sessionId: payload.sid, roles: payload.roles ?? [] };
    next();
  } catch (err) {
    next(err);
  }
}
