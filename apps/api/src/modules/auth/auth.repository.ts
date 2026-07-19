import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

/** The only place this module touches Prisma. */
export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  },

  recordLoginAttempt(data: Prisma.LoginHistoryUncheckedCreateInput) {
    return prisma.loginHistory.create({ data });
  },

  createSession(data: Prisma.SessionUncheckedCreateInput) {
    return prisma.session.create({ data });
  },

  findSessionById(id: string) {
    return prisma.session.findUnique({ where: { id } });
  },

  updateSession(id: string, data: Prisma.SessionUncheckedUpdateInput) {
    return prisma.session.update({ where: { id }, data });
  },

  updateUser(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },
};
