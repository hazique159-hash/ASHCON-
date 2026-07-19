// Drops and recreates the app database with UTF8 encoding.
// Needed because initdb on a Windows locale defaults the cluster to WIN1252,
// which cannot store currency symbols (₨, ﷼, €) or non-Latin text.
import { PrismaClient } from "@prisma/client";

const ADMIN_URL = "postgresql://ashcon:ashcon@localhost:5432/postgres";
const DB_NAME = "connect_affairs";

const admin = new PrismaClient({ datasources: { db: { url: ADMIN_URL } } });

try {
  await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await admin.$executeRawUnsafe(
    `CREATE DATABASE ${DB_NAME} WITH ENCODING 'UTF8' TEMPLATE template0`,
  );
  console.log(`Recreated database '${DB_NAME}' with UTF8 encoding.`);
} finally {
  await admin.$disconnect();
}
