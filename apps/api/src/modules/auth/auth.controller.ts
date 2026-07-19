import type { NextFunction, Request, Response } from "express";
import { env, isProduction } from "../../core/config/env";
import { UnauthorizedError } from "../../core/errors";
import { parseDuration } from "../../core/utils/duration";
import { authService } from "./auth.service";

const REFRESH_COOKIE = "ca_refresh";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
    maxAge: parseDuration(env.REFRESH_IDLE_TTL),
  });
}

function context(req: Request) {
  return { ip: req.ip, userAgent: req.get("user-agent") ?? undefined };
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.login(email, password, context(req));
      setRefreshCookie(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
          mustChangePassword: result.mustChangePassword,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
      if (!token) throw new UnauthorizedError("No active session. Please sign in.");
      const result = await authService.refresh(token, context(req));
      setRefreshCookie(res, result.refreshToken);
      res.json({ success: true, data: { accessToken: result.accessToken } });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
      if (token) await authService.logout(token);
      res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
      res.json({ success: true, data: { loggedOut: true } });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.me(req.user!.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
