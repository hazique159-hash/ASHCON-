import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../../core/middleware/authenticate";
import { validate } from "../../core/middleware/validate";
import { loginSchema } from "@ca/contracts";
import { authController } from "./auth.controller";

const credentialsLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait and try again." },
  },
});

export const authRoutes: Router = Router();

authRoutes.post("/login", credentialsLimiter, validate({ body: loginSchema }), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", authenticate, authController.me);
