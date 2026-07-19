import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors";
import { resolveEffectiveAccess } from "../rbac/permissions";

/**
 * Guards a route behind a `module:action` permission. Default-deny: applied by
 * the route factory to every protected endpoint.
 */
export function authorize(permission: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError("Authentication required.");
      const access = await resolveEffectiveAccess(req.user.id);
      if (!access.isSuperAdmin && !access.permissions.has(permission)) {
        throw new ForbiddenError(permission);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
