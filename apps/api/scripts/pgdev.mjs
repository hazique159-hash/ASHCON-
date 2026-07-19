// Dev-only: run a real PostgreSQL 16 locally via embedded-postgres (no Docker/admin).
// Production uses the Postgres container on the QNAP. This process stays alive until killed.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(import.meta.dirname, "../.pgdata");
const alreadyInitialised = existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "ashcon",
  password: "ashcon",
  port: 5432,
  persistent: true,
  // Force UTF8: on a Windows locale initdb would otherwise pick WIN1252,
  // which cannot store currency symbols or non-Latin text.
  initdbFlags: ["-E", "UTF8", "--locale=C"],
});

async function main() {
  if (!alreadyInitialised) {
    console.log("Initialising PostgreSQL data directory…");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("connect_affairs");
    console.log("Created database 'connect_affairs'.");
  } catch {
    console.log("Database 'connect_affairs' already exists.");
  }
  console.log("READY :: PostgreSQL 16 on localhost:5432 (db=connect_affairs, user=ashcon)");
}

main().catch((err) => {
  console.error("Failed to start embedded Postgres:", err);
  process.exit(1);
});

process.stdin.resume();
const shutdown = async () => {
  try {
    await pg.stop();
  } catch {
    /* ignore */
  }
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
