import type { AccountSubType, AccountType, NormalBalance, PrismaClient } from "@prisma/client";

interface AccountSeed {
  code: string;
  name: string;
  type: AccountType;
  subType: AccountSubType;
  isGroup?: boolean;
  parent?: string;
  /** Override for contra accounts (e.g. accumulated depreciation). */
  normalBalance?: NormalBalance;
  isSystem?: boolean;
}

/** Assets and expenses increase on the debit side; everything else on credit. */
function defaultNormalBalance(type: AccountType): NormalBalance {
  return type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT";
}

/**
 * Chart of accounts for a civil-engineering / PEB contractor.
 * Retention, WIP, subcontractor cost and variation revenue are the lines that
 * distinguish construction accounting from a generic template.
 */
const ACCOUNTS: AccountSeed[] = [
  // ── Assets ──
  { code: "1000", name: "Assets", type: "ASSET", subType: "OTHER_CURRENT_ASSET", isGroup: true },
  { code: "1100", name: "Current Assets", type: "ASSET", subType: "OTHER_CURRENT_ASSET", isGroup: true, parent: "1000" },
  { code: "1110", name: "Cash in Hand", type: "ASSET", subType: "CASH", parent: "1100", isSystem: true },
  { code: "1120", name: "Bank Accounts", type: "ASSET", subType: "BANK", isGroup: true, parent: "1100" },
  { code: "1121", name: "Bank — Current Account", type: "ASSET", subType: "BANK", parent: "1120", isSystem: true },
  { code: "1130", name: "Accounts Receivable", type: "ASSET", subType: "RECEIVABLE", parent: "1100", isSystem: true },
  { code: "1140", name: "Retention Receivable", type: "ASSET", subType: "RECEIVABLE", parent: "1100" },
  { code: "1150", name: "Advances to Suppliers", type: "ASSET", subType: "OTHER_CURRENT_ASSET", parent: "1100" },
  { code: "1160", name: "Inventory — Materials", type: "ASSET", subType: "INVENTORY", parent: "1100" },
  { code: "1170", name: "Work in Progress", type: "ASSET", subType: "INVENTORY", parent: "1100" },
  { code: "1180", name: "Prepaid Expenses", type: "ASSET", subType: "OTHER_CURRENT_ASSET", parent: "1100" },
  { code: "1190", name: "Input Tax (GST Receivable)", type: "ASSET", subType: "OTHER_CURRENT_ASSET", parent: "1100", isSystem: true },
  { code: "1200", name: "Fixed Assets", type: "ASSET", subType: "FIXED_ASSET", isGroup: true, parent: "1000" },
  { code: "1210", name: "Plant & Machinery", type: "ASSET", subType: "FIXED_ASSET", parent: "1200" },
  { code: "1220", name: "Vehicles", type: "ASSET", subType: "FIXED_ASSET", parent: "1200" },
  { code: "1230", name: "Office Equipment", type: "ASSET", subType: "FIXED_ASSET", parent: "1200" },
  { code: "1240", name: "Furniture & Fixtures", type: "ASSET", subType: "FIXED_ASSET", parent: "1200" },
  { code: "1290", name: "Accumulated Depreciation", type: "ASSET", subType: "ACCUMULATED_DEPRECIATION", parent: "1200", normalBalance: "CREDIT" },

  // ── Liabilities ──
  { code: "2000", name: "Liabilities", type: "LIABILITY", subType: "OTHER_CURRENT_LIABILITY", isGroup: true },
  { code: "2100", name: "Current Liabilities", type: "LIABILITY", subType: "OTHER_CURRENT_LIABILITY", isGroup: true, parent: "2000" },
  { code: "2110", name: "Accounts Payable", type: "LIABILITY", subType: "PAYABLE", parent: "2100", isSystem: true },
  { code: "2120", name: "Retention Payable", type: "LIABILITY", subType: "PAYABLE", parent: "2100" },
  { code: "2130", name: "Accrued Expenses", type: "LIABILITY", subType: "OTHER_CURRENT_LIABILITY", parent: "2100" },
  { code: "2140", name: "Salaries Payable", type: "LIABILITY", subType: "OTHER_CURRENT_LIABILITY", parent: "2100", isSystem: true },
  { code: "2150", name: "Output Tax (GST Payable)", type: "LIABILITY", subType: "TAX_PAYABLE", parent: "2100", isSystem: true },
  { code: "2160", name: "Withholding Tax Payable", type: "LIABILITY", subType: "TAX_PAYABLE", parent: "2100" },
  { code: "2170", name: "Advances from Customers", type: "LIABILITY", subType: "OTHER_CURRENT_LIABILITY", parent: "2100" },
  { code: "2200", name: "Long Term Liabilities", type: "LIABILITY", subType: "LONG_TERM_LIABILITY", isGroup: true, parent: "2000" },
  { code: "2210", name: "Long Term Loans", type: "LIABILITY", subType: "LONG_TERM_LIABILITY", parent: "2200" },

  // ── Equity ──
  { code: "3000", name: "Equity", type: "EQUITY", subType: "SHARE_CAPITAL", isGroup: true },
  { code: "3100", name: "Share Capital", type: "EQUITY", subType: "SHARE_CAPITAL", parent: "3000" },
  { code: "3200", name: "Retained Earnings", type: "EQUITY", subType: "RETAINED_EARNINGS", parent: "3000", isSystem: true },
  { code: "3300", name: "Current Year Earnings", type: "EQUITY", subType: "RETAINED_EARNINGS", parent: "3000", isSystem: true },

  // ── Income ──
  { code: "4000", name: "Income", type: "INCOME", subType: "OPERATING_INCOME", isGroup: true },
  { code: "4100", name: "Contract Revenue", type: "INCOME", subType: "OPERATING_INCOME", parent: "4000", isSystem: true },
  { code: "4200", name: "Variation Order Revenue", type: "INCOME", subType: "OPERATING_INCOME", parent: "4000" },
  { code: "4900", name: "Other Income", type: "INCOME", subType: "OTHER_INCOME", parent: "4000" },

  // ── Direct costs ──
  { code: "5000", name: "Direct Costs", type: "EXPENSE", subType: "DIRECT_COST", isGroup: true },
  { code: "5100", name: "Materials Consumed", type: "EXPENSE", subType: "DIRECT_COST", parent: "5000" },
  { code: "5200", name: "Subcontractor Costs", type: "EXPENSE", subType: "DIRECT_COST", parent: "5000" },
  { code: "5300", name: "Direct Labour", type: "EXPENSE", subType: "DIRECT_COST", parent: "5000" },
  { code: "5400", name: "Equipment Hire", type: "EXPENSE", subType: "DIRECT_COST", parent: "5000" },
  { code: "5500", name: "Site Overheads", type: "EXPENSE", subType: "DIRECT_COST", parent: "5000" },

  // ── Operating expenses ──
  { code: "6000", name: "Operating Expenses", type: "EXPENSE", subType: "OPERATING_EXPENSE", isGroup: true },
  { code: "6100", name: "Salaries & Wages", type: "EXPENSE", subType: "PAYROLL_EXPENSE", parent: "6000", isSystem: true },
  { code: "6110", name: "Employee Benefits", type: "EXPENSE", subType: "PAYROLL_EXPENSE", parent: "6000" },
  { code: "6200", name: "Rent", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6210", name: "Utilities", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6220", name: "Fuel & Travel", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6230", name: "Repairs & Maintenance", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6240", name: "Professional Fees", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6250", name: "Insurance", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6260", name: "Office & Administration", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000" },
  { code: "6300", name: "Depreciation", type: "EXPENSE", subType: "DEPRECIATION", parent: "6000" },
  { code: "6900", name: "Bank Charges", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6000" },
];

const TAX_RATES = [
  { code: "GST-17", name: "GST 17%", kind: "GST" as const, rate: "17.0000", account: "2150" },
  { code: "GST-0", name: "GST 0% (exempt)", kind: "GST" as const, rate: "0.0000", account: "2150" },
  { code: "WHT-4.5", name: "Withholding 4.5% (services)", kind: "WITHHOLDING" as const, rate: "4.5000", account: "2160" },
];

export async function seedChartOfAccounts(prisma: PrismaClient): Promise<void> {
  const baseCurrency = await prisma.currency.findUnique({ where: { code: "PKR" } });

  // Parents first, so a child's parentId always resolves.
  const idByCode = new Map<string, string>();
  for (const seed of ACCOUNTS) {
    const account = await prisma.account.upsert({
      where: { code: seed.code },
      update: {},
      create: {
        code: seed.code,
        name: seed.name,
        type: seed.type,
        subType: seed.subType,
        normalBalance: seed.normalBalance ?? defaultNormalBalance(seed.type),
        isGroup: seed.isGroup ?? false,
        parentId: seed.parent ? (idByCode.get(seed.parent) ?? null) : null,
        currencyId: seed.isGroup ? null : (baseCurrency?.id ?? null),
        isSystem: seed.isSystem ?? false,
      },
    });
    idByCode.set(seed.code, account.id);
  }
  console.log(`  ✓ ${ACCOUNTS.length} chart-of-accounts entries`);

  for (const tax of TAX_RATES) {
    await prisma.taxRate.upsert({
      where: { code: tax.code },
      update: {},
      create: {
        code: tax.code,
        name: tax.name,
        kind: tax.kind,
        rate: tax.rate,
        accountId: idByCode.get(tax.account) ?? null,
      },
    });
  }
  console.log(`  ✓ ${TAX_RATES.length} tax rates`);

  // ── Fiscal year + monthly periods ──
  const company = await prisma.company.findFirst({ select: { fiscalYearStartMonth: true } });
  const startMonth = company?.fiscalYearStartMonth ?? 7;
  const today = new Date();
  // If we're before the FY start month, the current FY began last calendar year.
  const startYear = today.getUTCMonth() + 1 >= startMonth ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const fyName = `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;

  const fiscalYear = await prisma.fiscalYear.upsert({
    where: { name: fyName },
    update: {},
    create: {
      name: fyName,
      startDate: new Date(Date.UTC(startYear, startMonth - 1, 1)),
      endDate: new Date(Date.UTC(startYear + 1, startMonth - 1, 0)),
    },
  });

  for (let offset = 0; offset < 12; offset += 1) {
    const periodStart = new Date(Date.UTC(startYear, startMonth - 1 + offset, 1));
    const periodEnd = new Date(Date.UTC(startYear, startMonth + offset, 0));
    const name = periodStart.toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" });
    await prisma.accountingPeriod.upsert({
      where: { fiscalYearId_name: { fiscalYearId: fiscalYear.id, name } },
      update: {},
      create: { fiscalYearId: fiscalYear.id, name, startDate: periodStart, endDate: periodEnd },
    });
  }
  console.log(`  ✓ ${fyName} with 12 monthly periods`);
}
