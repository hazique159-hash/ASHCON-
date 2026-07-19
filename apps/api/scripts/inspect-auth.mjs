// Dev diagnostic: dump seeded reference data, active sessions and login history.
// Usage: pnpm --filter @ca/api exec node scripts/inspect-auth.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [users, roles, permissions, departments, currencies] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.department.count(),
    prisma.currency.count(),
  ]);
  console.log(
    `counts -> users=${users} roles=${roles} permissions=${permissions} departments=${departments} currencies=${currencies}`,
  );

  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      tokenVersion: true,
      revokedAt: true,
      revokedReason: true,
      reuseDetectedAt: true,
      ip: true,
    },
    orderBy: { issuedAt: "desc" },
  });
  console.log(`\nSESSIONS (${sessions.length}):`);
  console.log(JSON.stringify(sessions, null, 2));

  const newest = await prisma.user.findMany({
    select: {
      email: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      status: true,
      mustChangePassword: true,
      createdById: true,
      department: { select: { name: true } },
      roles: { select: { role: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  console.log("\nNEWEST USERS:");
  console.log(JSON.stringify(newest, null, 2));

  const audit = await prisma.auditLog.findMany({
    select: { action: true, module: true, entityType: true, entityId: true, actorId: true, after: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  console.log("\nRECENT AUDIT LOG:");
  console.log(JSON.stringify(audit, null, 2));

  const history = await prisma.loginHistory.findMany({
    select: { email: true, success: true, reason: true, ip: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  console.log("\nLOGIN HISTORY (most recent):");
  console.log(JSON.stringify(history, null, 2));
} finally {
  await prisma.$disconnect();
}
