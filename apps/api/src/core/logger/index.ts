import pino from "pino";
import { env, isProduction } from "../config/env";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  base: { app: "connect-affairs-api", env: env.NODE_ENV },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.passwordHash"],
    remove: true,
  },
});
