import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export const financeRepository = {
  listAccounts() {
    return prisma.account.findMany({
      where: { deletedAt: null },
      include: { parent: { select: { code: true } } },
      orderBy: { code: "asc" },
    });
  },

  findAccountByCode(code: string) {
    return prisma.account.findUnique({ where: { code } });
  },

  findAccountsByIds(ids: string[]) {
    return prisma.account.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, code: true, name: true, isGroup: true, active: true },
    });
  },

  createAccount(data: Prisma.AccountUncheckedCreateInput) {
    return prisma.account.create({ data });
  },

  listJournalEntries() {
    return prisma.journalEntry.findMany({
      where: { deletedAt: null },
      include: {
        period: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: [{ entryDate: "desc" }, { entryNumber: "desc" }],
      take: 200,
    });
  },

  findJournalEntry(id: string) {
    return prisma.journalEntry.findFirst({
      where: { id, deletedAt: null },
      include: {
        period: { select: { name: true } },
        lines: {
          include: { account: { select: { code: true, name: true } } },
          orderBy: { lineNumber: "asc" },
        },
      },
    });
  },

  /** Period whose date range contains the entry date. */
  findPeriodForDate(date: Date) {
    return prisma.accountingPeriod.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      include: { fiscalYear: { select: { status: true } } },
    });
  },

  countEntriesForPrefix(prefix: string) {
    return prisma.journalEntry.count({ where: { entryNumber: { startsWith: prefix } } });
  },

  createJournalEntry(data: Prisma.JournalEntryUncheckedCreateInput) {
    return prisma.journalEntry.create({ data });
  },

  createJournalLines(data: Prisma.JournalLineUncheckedCreateInput[]) {
    return prisma.journalLine.createMany({ data });
  },

  markPosted(id: string, postedById: string) {
    return prisma.journalEntry.update({
      where: { id },
      data: { status: "POSTED", postedAt: new Date(), postedById },
    });
  },

  /** Trial balance: posted movement per account up to a date. */
  sumPostedLines(asOf: Date) {
    return prisma.journalLine.groupBy({
      by: ["accountId"],
      where: { entry: { status: "POSTED", deletedAt: null, entryDate: { lte: asOf } } },
      _sum: { debit: true, credit: true },
    });
  },

  listPeriods() {
    return prisma.accountingPeriod.findMany({
      select: { id: true, name: true, status: true, startDate: true },
      orderBy: { startDate: "asc" },
    });
  },

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },

  writeAudit(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data });
  },
};
