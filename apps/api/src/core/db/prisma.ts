import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env";

/** Single Prisma client for the process. Repositories are the only consumers. */
export const prisma = new PrismaClient({
  log: isProduction ? ["warn", "error"] : ["warn", "error"],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
