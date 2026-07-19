import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./core/config/env";
import { logger } from "./core/logger";
import { prisma } from "./core/db/prisma";
import { errorHandler, notFoundHandler } from "./core/middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { employeeRoutes } from "./modules/employee/employee.routes";
import { financeRoutes } from "./modules/finance/finance.routes";
import { hrRoutes } from "./modules/hr/hr.routes";

export function createServer(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/healthz" } }));

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/readyz", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  // Module routes. Business modules self-register here via the module registry.
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/employees", employeeRoutes);
  app.use("/api/finance", financeRoutes);
  app.use("/api/hr", hrRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
