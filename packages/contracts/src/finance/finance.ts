import { z } from "zod";

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const JOURNAL_STATUSES = ["DRAFT", "POSTED", "REVERSED"] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Money as a string; the service converts to Decimal. "" means zero. */
const amount = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,13}(\.\d{1,2})?$/.test(v), "Enter a valid amount")
  .optional();

/** Cents as an integer — avoids float drift when checking the balance. */
function cents(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export const journalLineSchema = z.object({
  accountId: z.string().trim().min(1, "Select an account"),
  description: optionalText(200),
  debit: amount,
  credit: amount,
  projectId: optionalText(40),
});

export type JournalLineInput = z.infer<typeof journalLineSchema>;

/**
 * The accounting invariant lives here, in the shared contract, so the browser
 * and the API enforce byte-identical rules:
 *   · every line is either a debit or a credit, never both, never neither
 *   · total debits must equal total credits
 */
export const createJournalSchema = z
  .object({
    entryDate: z
      .string()
      .trim()
      .min(1, "Entry date is required")
      .regex(DATE_PATTERN, "Use the date picker (YYYY-MM-DD)"),
    reference: optionalText(60),
    narration: z.string().trim().min(1, "Narration is required").max(300),
    projectId: optionalText(40),
    postImmediately: z.boolean().optional(),
    lines: z.array(journalLineSchema).min(2, "A journal entry needs at least two lines"),
  })
  .superRefine((value, ctx) => {
    let totalDebit = 0;
    let totalCredit = 0;

    value.lines.forEach((line, index) => {
      const debit = cents(line.debit);
      const credit = cents(line.credit);

      if (debit > 0 && credit > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "debit"],
          message: "A line cannot hold both a debit and a credit",
        });
      }
      if (debit === 0 && credit === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "debit"],
          message: "Enter a debit or a credit",
        });
      }
      totalDebit += debit;
      totalCredit += credit;
    });

    if (totalDebit !== totalCredit) {
      const difference = ((totalDebit - totalCredit) / 100).toFixed(2);
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: `Entry is out of balance by ${difference}. Debits must equal credits.`,
      });
    }

    if (totalDebit === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: "An entry must move a non-zero amount.",
      });
    }
  });

export type CreateJournalInput = z.infer<typeof createJournalSchema>;

export const createAccountSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20),
  name: z.string().trim().min(1, "Name is required").max(120),
  type: z.enum(ACCOUNT_TYPES),
  subType: z.string().trim().min(1, "Select a category"),
  parentId: optionalText(40),
  description: optionalText(300),
  isGroup: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// ── Responses ───────────────────────────────────────────────────────────────

export interface AccountListItem {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  normalBalance: "DEBIT" | "CREDIT";
  isGroup: boolean;
  isSystem: boolean;
  parentCode: string | null;
  /** Nesting depth, for indenting the chart of accounts. */
  depth: number;
  active: boolean;
}

export interface JournalLineItem {
  id: string;
  lineNumber: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: string;
  credit: string;
}

export interface JournalListItem {
  id: string;
  entryNumber: string;
  entryDate: string;
  reference: string | null;
  narration: string;
  source: string;
  status: JournalStatus;
  totalDebit: string;
  totalCredit: string;
  period: string | null;
  lineCount: number;
}

export interface JournalDetail extends JournalListItem {
  lines: JournalLineItem[];
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: string;
  credit: string;
}

export interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

export interface FinanceReference {
  accounts: { id: string; code: string; name: string; type: AccountType }[];
  periods: { id: string; name: string; status: string }[];
}
