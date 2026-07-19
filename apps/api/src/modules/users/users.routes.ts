import { Router } from "express";
import { authenticate } from "../../core/middleware/authenticate";
import { authorize } from "../../core/middleware/authorize";
import { validate } from "../../core/middleware/validate";
import { createUserSchema } from "@ca/contracts";
import { usersController } from "./users.controller";

export const usersRoutes: Router = Router();

// Default-deny: every route requires authentication AND an explicit permission.
usersRoutes.get("/", authenticate, authorize("users:view"), usersController.list);
usersRoutes.get("/reference", authenticate, authorize("users:view"), usersController.reference);
usersRoutes.post(
  "/",
  authenticate,
  authorize("users:create"),
  validate({ body: createUserSchema }),
  usersController.create,
);
