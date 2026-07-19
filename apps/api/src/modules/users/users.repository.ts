import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export const usersRepository = {
  findAll() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        roles: { include: { role: true } },
        department: true,
        designation: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data });
  },

  assignRole(userId: string, roleId: string) {
    return prisma.userRole.create({ data: { userId, roleId } });
  },

  listDepartments() {
    return prisma.department.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  },

  listRoles() {
    return prisma.role.findMany({
      where: { active: true },
      select: { id: true, name: true, key: true, rank: true },
      orderBy: { rank: "asc" },
    });
  },

  writeAudit(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data });
  },
};
