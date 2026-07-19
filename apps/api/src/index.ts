import "dotenv/config";
import { createServer } from "./server";
import { env } from "./core/config/env";
import { logger } from "./core/logger";
import { disconnectPrisma } from "./core/db/prisma";

const app = createServer();

const server = app.listen(env.API_PORT, () => {
  logger.info(`Connect Affairs API listening on http://localhost:${env.API_PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down`);
  server.close();
  await disconnectPrisma();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
