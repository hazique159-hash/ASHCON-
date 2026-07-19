import type {
  AccountListItem,
  AccountType,
  CreateAccountInput,
  CreateJournalInput,
  FinanceReference,
  JournalDetail,
  JournalListItem,
  JournalStatus,
  TrialBalance,
} from "@ca/contracts";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors";
import { financeRepository } from "./finance.repository";

function toDate(value: string): Date {
  return new Date(`${value.trim()}T00:00:00.000Z`);
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Money in integer cents — never compare Decimals as floats. */
function cents(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function money(centsValue: number): string {
  return (centsValue / 100).toFixed(2);
}

export const financeService = {
  async listAccounts(): Promise<AccountListItem[]> {
    const accounts = await financeRepository.listAccounts();

    // Depth from the code hierarchy: parents are seeded before children.
    const depthById = new Map<string, number>();
    for (const account of accounts) {
      const parentDepth = account.parentId ? (depthById.get(account.parentId) ?? 0) : -1;
      depthById.set(account.id, parentDepth + 1);
    }

    return accounts.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type as AccountType,
      subType: account.subType,
      normalBalance: account.normalBalance,
      isGroup: account.isGroup,
      isSystem: account.isSystem,
      parentCode: account.parent?.code ?? null,
      depth: depthById.get(account.id) ?? 0,
      active: account.active,
    }));
  },

  async createAccount(input: CreateAccountInput, actorId: string) {
    const code = input.code.trim();
    const existing = await financeRepository.findAccountByCode(code);
    if (existing) throw new ConflictError("That account code is already in use.");

    const account = await financeRepository.createAccount({
      code,
      name: input.name.trim(),
      type: input.type,
      subType: input.subType as never,
      normalBalance: input.type === "ASSET" || input.type === "EXPENSE" ? "DEBIT" : "CREDIT",
      isGroup: input.isGroup ?? false,
      parentId: emptyToNull(input.parentId),
      description: emptyToNull(input.description),
      createdById: actorId,
    });

    await financeRepository.writeAudit({
      actorId,
      action: "CREATE",
      module: "finance",
      entityType: "Account",
      entityId: account.id,
      after: { code: account.code, name: account.name, type: account.type },
    });

    return { id: account.id, code: account.code, name: account.name };
  },

  async listJournal(): Promise<JournalListItem[]> {
    const entries = await financeRepository.listJournalEntries();
    return entries.map((entry) => ({
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: dateOnly(entry.entryDate),
      reference: entry.reference,
      narration: entry.narration,
      source: entry.source,
      status: entry.status as JournalStatus,
      totalDebit: entry.totalDebit.toString(),
      totalCredit: entry.totalCredit.toString(),
      period: entry.period?.name ?? null,
      lineCount: entry._count.lines,
    }));
  },

  async journalDetail(id: string): Promise<JournalDetail> {
    const entry = await financeRepository.findJournalEntry(id);
    if (!entry) throw new NotFoundError("Journal entry");

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: dateOnly(entry.entryDate),
      reference: entry.reference,
      narration: entry.narration,
      source: entry.source,
      status: entry.status as JournalStatus,
      totalDebit: entry.totalDebit.toString(),
      totalCredit: entry.totalCredit.toString(),
      period: entry.period?.name ?? null,
      lineCount: entry.lines.length,
      lines: entry.lines.map((line) => ({
        id: line.id,
        lineNumber: line.lineNumber,
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        description: line.description,
        debit: line.debit.toString(),
        credit: line.credit.toString(),
      })),
    };
  },

  /**
   * Creates a balanced journal entry.
   *
   * The shared schema already enforces the debit/credit invariant, but the
   * service re-derives the totals rather than trusting the client, and applies
   * the controls a ledger needs: an open period, and postings only to leaf
   * (non-group) accounts.
   */
  async createJournal(input: CreateJournalInput, actorId: string) {
    const entryDate = toDate(input.entryDate);

    const period = await financeRepository.findPeriodForDate(entryDate);
    if (!period) {
      throw new BadRequestError(
        "No accounting period covers that date. Open a fiscal year first.",
      );
    }
    if (period.status === "CLOSED" || period.fiscalYear.status === "CLOSED") {
      throw new ConflictError(`Period "${period.name}" is closed; entries cannot be posted to it.`);
    }

    const accountIds = [...new Set(input.lines.map((line) => line.accountId))];
    const accounts = await financeRepository.findAccountsByIds(accountIds);
    if (accounts.length !== accountIds.length) {
      throw new BadRequestError("One or more selected accounts no longer exist.");
    }
    const groupAccount = accounts.find((account) => account.isGroup);
    if (groupAccount) {
      throw new BadRequestError(
        `"${groupAccount.code} ${groupAccount.name}" is a heading. Post to a detail account instead.`,
      );
    }
    const inactive = accounts.find((account) => !account.active);
    if (inactive) {
      throw new BadRequestError(`Account "${inactive.code} ${inactive.name}" is inactive.`);
    }

    // Recompute totals server-side; the request body is never authoritative.
    let totalDebitCents = 0;
    let totalCreditCents = 0;
    for (const line of input.lines) {
      totalDebitCents += cents(line.debit);
      totalCreditCents += cents(line.credit);
    }
    if (totalDebitCents !== totalCreditCents) {
      throw new BadRequestError(
        `Entry is out of balance by ${money(totalDebitCents - totalCreditCents)}.`,
      );
    }
    if (totalDebitCents === 0) throw new BadRequestError("An entry must move a non-zero amount.");

    // JE-YYYYMM-0001. Sequential within the month.
    const prefix = `JE-${entryDate.toISOString().slice(0, 7).replace("-", "")}-`;
    const used = await financeRepository.countEntriesForPrefix(prefix);
    const entryNumber = `${prefix}${String(used + 1).padStart(4, "0")}`;

    const shouldPost = input.postImmediately ?? false;

    const entry = await financeRepository.runInTransaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate,
          periodId: period.id,
          reference: emptyToNull(input.reference),
          narration: input.narration.trim(),
          source: "MANUAL",
          status: shouldPost ? "POSTED" : "DRAFT",
          totalDebit: money(totalDebitCents),
          totalCredit: money(totalCreditCents),
          projectId: emptyToNull(input.projectId),
          postedAt: shouldPost ? new Date() : null,
          postedById: shouldPost ? actorId : null,
          createdById: actorId,
        },
      });

      await tx.journalLine.createMany({
        data: input.lines.map((line, index) => ({
          entryId: created.id,
          lineNumber: index + 1,
          accountId: line.accountId,
          description: emptyToNull(line.description),
          debit: money(cents(line.debit)),
          credit: money(cents(line.credit)),
          projectId: emptyToNull(line.projectId) ?? emptyToNull(input.projectId),
        })),
      });

      return created;
    });

    await financeRepository.writeAudit({
      actorId,
      action: shouldPost ? "POST" : "CREATE",
      module: "finance",
      entityType: "JournalEntry",
      entityId: entry.id,
      after: {
        entryNumber: entry.entryNumber,
        totalDebit: money(totalDebitCents),
        status: entry.status,
      },
    });

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      status: entry.status as JournalStatus,
      totalDebit: money(totalDebitCents),
    };
  },

  async postJournal(id: string, actorId: string) {
    const entry = await financeRepository.findJournalEntry(id);
    if (!entry) throw new NotFoundError("Journal entry");
    if (entry.status === "POSTED") throw new ConflictError("That entry is already posted.");
    if (entry.status === "REVERSED") throw new ConflictError("That entry has been reversed.");

    // Re-assert the invariant at posting time.
    const totalDebit = entry.lines.reduce((sum, line) => sum + cents(line.debit.toString()), 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + cents(line.credit.toString()), 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestError("Entry is out of balance and cannot be posted.");
    }

    await financeRepository.markPosted(id, actorId);
    await financeRepository.writeAudit({
      actorId,
      action: "POST",
      module: "finance",
      entityType: "JournalEntry",
      entityId: id,
      after: { entryNumber: entry.entryNumber },
    });

    return { id, entryNumber: entry.entryNumber, status: "POSTED" as JournalStatus };
  },

  /** Derived from posted lines — never stored, so it cannot drift. */
  async trialBalance(asOfInput?: string): Promise<TrialBalance> {
    const asOf = asOfInput ? toDate(asOfInput) : new Date();
    const [sums, accounts] = await Promise.all([
      financeRepository.sumPostedLines(asOf),
      financeRepository.listAccounts(),
    ]);

    const accountById = new Map(accounts.map((account) => [account.id, account]));
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = sums
      .map((sum) => {
        const account = accountById.get(sum.accountId);
        if (!account) return null;

        const debit = cents(sum._sum.debit?.toString());
        const credit = cents(sum._sum.credit?.toString());
        // Present the net movement on the account's normal side.
        const net = debit - credit;
        const debitCents = net > 0 ? net : 0;
        const creditCents = net < 0 ? -net : 0;
        totalDebit += debitCents;
        totalCredit += creditCents;

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type as AccountType,
          debit: money(debitCents),
          credit: money(creditCents),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .filter((row) => row.debit !== "0.00" || row.credit !== "0.00")
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      asOf: dateOnly(asOf),
      rows,
      totalDebit: money(totalDebit),
      totalCredit: money(totalCredit),
      balanced: totalDebit === totalCredit,
    };
  },

  async reference(): Promise<FinanceReference> {
    const [accounts, periods] = await Promise.all([
      financeRepository.listAccounts(),
      financeRepository.listPeriods(),
    ]);

    return {
      // Only postable (leaf, active) accounts appear in pickers.
      accounts: accounts
        .filter((account) => !account.isGroup && account.active)
        .map((account) => ({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type as AccountType,
        })),
      periods: periods.map((period) => ({
        id: period.id,
        name: period.name,
        status: period.status,
      })),
    };
  },
};
