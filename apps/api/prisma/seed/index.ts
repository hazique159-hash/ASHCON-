import "dotenv/config";
import type { PermissionAction } from "@prisma/client";
import { prisma } from "../../src/core/db/prisma";
import { hashPassword } from "../../src/core/auth/password";
import { env } from "../../src/core/config/env";
import { seedChartOfAccounts } from "./chart-of-accounts";
import { seedHrReference } from "./hr-reference";

const MODULES = [
  "employee",
  "hr",
  "payroll",
  "finance",
  "procurement",
  "inventory",
  "projects",
  "boq",
  "vehicle",
  "documents",
  "helpdesk",
  "comms",
  "calendar",
  "reports",
  "settings",
  "users",
] as const;

const ALL_ACTIONS: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE", "APPROVE", "EXPORT"];
const READ_ONLY: PermissionAction[] = ["VIEW", "EXPORT"];
const CONTRIBUTE: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "EXPORT"];

interface Grant {
  modules: readonly string[];
  actions: PermissionAction[];
}

interface RoleSeed {
  key: string;
  name: string;
  rank: number;
  description: string;
  grants: Grant[];
}

const ROLES: RoleSeed[] = [
  {
    key: "super_admin",
    name: "Super Admin",
    rank: 0,
    description: "Full system access and configuration.",
    grants: [{ modules: MODULES, actions: ALL_ACTIONS }],
  },
  {
    key: "ceo",
    name: "CEO",
    rank: 10,
    description: "Company-wide visibility and approval authority.",
    grants: [{ modules: MODULES, actions: ["VIEW", "APPROVE", "EXPORT"] }],
  },
  {
    key: "managing_director",
    name: "Managing Director",
    rank: 20,
    description: "Company-wide visibility and approval authority.",
    grants: [{ modules: MODULES, actions: ["VIEW", "APPROVE", "EXPORT"] }],
  },
  {
    key: "fact_manager",
    name: "FACT Manager",
    rank: 30,
    description: "Finance, Accounting, Controlling and Taxation.",
    grants: [
      { modules: ["finance", "payroll", "reports"], actions: ALL_ACTIONS },
      { modules: MODULES, actions: READ_ONLY },
    ],
  },
  {
    key: "ao_manager",
    name: "AO Manager",
    rank: 30,
    description: "Administration and Operations.",
    grants: [
      {
        modules: ["hr", "procurement", "inventory", "vehicle", "documents", "helpdesk"],
        actions: ALL_ACTIONS,
      },
      { modules: MODULES, actions: READ_ONLY },
    ],
  },
  {
    key: "project_manager",
    name: "Project Manager",
    rank: 40,
    description: "Owns project delivery and BOQ.",
    grants: [
      { modules: ["projects", "boq"], actions: ALL_ACTIONS },
      { modules: ["procurement", "inventory", "finance", "employee", "reports"], actions: READ_ONLY },
    ],
  },
  {
    key: "tendering_billing_engineer",
    name: "Tendering & Billing Engineer",
    rank: 50,
    description: "Tendering, billing and BOQ preparation.",
    grants: [
      { modules: ["boq"], actions: ALL_ACTIONS },
      { modules: ["projects"], actions: CONTRIBUTE },
      { modules: ["finance", "reports"], actions: READ_ONLY },
    ],
  },
  {
    key: "planning_costing_engineer",
    name: "Planning & Costing Engineer",
    rank: 50,
    description: "Planning, costing and rate analysis.",
    grants: [
      { modules: ["boq"], actions: ALL_ACTIONS },
      { modules: ["projects"], actions: CONTRIBUTE },
      { modules: ["inventory", "reports"], actions: READ_ONLY },
    ],
  },
  {
    key: "procurement_inventory_officer",
    name: "Procurement & Inventory Officer",
    rank: 50,
    description: "Purchasing, vendors, stock and materials.",
    grants: [
      { modules: ["procurement", "inventory"], actions: ALL_ACTIONS },
      { modules: ["projects", "vehicle", "reports"], actions: READ_ONLY },
    ],
  },
  {
    key: "site_incharge",
    name: "Site In-charge",
    rank: 60,
    description: "Site execution, daily reports and material use.",
    grants: [
      { modules: ["projects"], actions: CONTRIBUTE },
      { modules: ["inventory", "documents", "helpdesk"], actions: ["VIEW"] },
    ],
  },
  {
    key: "admin_incharge",
    name: "Admin In-charge",
    rank: 60,
    description: "Documents, helpdesk and attendance administration.",
    grants: [
      { modules: ["documents", "helpdesk"], actions: CONTRIBUTE },
      { modules: ["hr"], actions: ["VIEW", "CREATE", "EDIT"] },
      { modules: ["employee"], actions: ["VIEW"] },
    ],
  },
];

const CURRENCIES = [
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", isBase: true },
  { code: "USD", name: "US Dollar", symbol: "$", isBase: false },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", isBase: false },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", isBase: false },
  { code: "INR", name: "Indian Rupee", symbol: "₹", isBase: false },
  { code: "EUR", name: "Euro", symbol: "€", isBase: false },
  { code: "GBP", name: "Pound Sterling", symbol: "£", isBase: false },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", isBase: false },
];

/** Job titles for a civil-engineering / PEB contractor, by department. */
const DESIGNATIONS = [
  { code: "PM", name: "Project Manager", dept: "TECH", level: 40 },
  { code: "STR-ENG", name: "Structural Engineer", dept: "TECH", level: 50 },
  { code: "SITE-ENG", name: "Site Engineer", dept: "TECH", level: 55 },
  { code: "SITE-SUP", name: "Site Supervisor", dept: "TECH", level: 60 },
  { code: "PLAN-ENG", name: "Planning Engineer", dept: "TECH", level: 50 },
  { code: "QS", name: "Quantity Surveyor", dept: "TECH", level: 50 },
  { code: "DRAFT", name: "Draftsman", dept: "TECH", level: 65 },
  { code: "HR-OFF", name: "HR Officer", dept: "AO", level: 55 },
  { code: "ADM-OFF", name: "Admin Officer", dept: "AO", level: 55 },
  { code: "PROC-OFF", name: "Procurement Officer", dept: "AO", level: 55 },
  { code: "STORE", name: "Store Keeper", dept: "AO", level: 65 },
  { code: "DRIVER", name: "Driver", dept: "AO", level: 70 },
  { code: "FIN-MGR", name: "Finance Manager", dept: "FIN", level: 30 },
  { code: "ACCT", name: "Accountant", dept: "FIN", level: 55 },
  { code: "ACCT-OFF", name: "Accounts Officer", dept: "FIN", level: 60 },
];

const DEPARTMENTS = [
  { code: "TECH", name: "Technical Department", description: "Engineering, projects, planning and design." },
  { code: "AO", name: "Administration & Operations Department", description: "Administration, HR, procurement and operations." },
  { code: "FIN", name: "Accounts & Finance Department", description: "Accounting, finance, payroll and taxation." },
];

async function main(): Promise<void> {
  console.log("Seeding Connect Affairs…");

  // ── Currencies ──────────────────────────────────────────────────────────
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  const baseCurrency = await prisma.currency.findUniqueOrThrow({ where: { code: "PKR" } });
  console.log(`  ✓ ${CURRENCIES.length} currencies (base: PKR)`);

  // ── Company (singleton) ─────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: "cmp_ashcon" },
    update: {},
    create: {
      id: "cmp_ashcon",
      name: "Ashcon Engineering",
      legalName: "Ashcon Engineering",
      country: "Pakistan",
      baseCurrencyId: baseCurrency.id,
      timezone: "Asia/Karachi",
      locale: "en",
      taxType: "GST",
      // false → the Super Admin completes company details in the first-run wizard
      setupCompleted: false,
    },
  });
  console.log(`  ✓ Company: ${company.name}`);

  await prisma.branch.upsert({
    where: { code: "HO" },
    update: {},
    create: { companyId: company.id, code: "HO", name: "Head Office", isHeadOffice: true },
  });
  console.log("  ✓ Head Office branch");

  // ── Departments ─────────────────────────────────────────────────────────
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { code: d.code }, update: {}, create: d });
  }
  console.log(`  ✓ ${DEPARTMENTS.length} departments`);

  // ── Designations ────────────────────────────────────────────────────────
  const departmentsByCode = new Map(
    (await prisma.department.findMany({ select: { id: true, code: true } })).map((d) => [
      d.code,
      d.id,
    ]),
  );
  for (const designation of DESIGNATIONS) {
    await prisma.designation.upsert({
      where: { code: designation.code },
      update: {},
      create: {
        code: designation.code,
        name: designation.name,
        level: designation.level,
        departmentId: departmentsByCode.get(designation.dept) ?? null,
      },
    });
  }
  console.log(`  ✓ ${DESIGNATIONS.length} designations`);

  // ── Permissions (module:action) ─────────────────────────────────────────
  const permissionIds = new Map<string, string>();
  for (const moduleName of MODULES) {
    for (const action of ALL_ACTIONS) {
      const key = `${moduleName}:${action.toLowerCase()}`;
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, module: moduleName, action, description: `${action} on ${moduleName}` },
      });
      permissionIds.set(key, permission.id);
    }
  }
  console.log(`  ✓ ${permissionIds.size} permissions`);

  // ── Roles + permission matrix ───────────────────────────────────────────
  for (const roleSeed of ROLES) {
    const role = await prisma.role.upsert({
      where: { key: roleSeed.key },
      update: { name: roleSeed.name, description: roleSeed.description, rank: roleSeed.rank },
      create: {
        key: roleSeed.key,
        name: roleSeed.name,
        description: roleSeed.description,
        rank: roleSeed.rank,
        isSystem: true,
      },
    });

    const keys = new Set<string>();
    for (const grant of roleSeed.grants) {
      for (const moduleName of grant.modules) {
        for (const action of grant.actions) keys.add(`${moduleName}:${action.toLowerCase()}`);
      }
    }

    await prisma.rolePermission.createMany({
      data: [...keys]
        .map((k) => permissionIds.get(k))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  console.log(`  ✓ ${ROLES.length} roles with permission matrix`);

  // ── Finance: chart of accounts, tax rates, fiscal calendar ──────────────
  await seedChartOfAccounts(prisma);

  // ── HR: leave types and the holiday calendar ────────────────────────────
  await seedHrReference(prisma);

  // ── Super Admin ─────────────────────────────────────────────────────────
  const adminEmail = env.SEED_ADMIN_EMAIL;
  const adminPassword = env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed the admin user.");
  }

  const financeDept = await prisma.department.findUniqueOrThrow({ where: { code: "AO" } });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      firstName: "Super",
      lastName: "Admin",
      employeeCode: "ASH-0001",
      status: "ACTIVE",
      isSuperAdmin: true,
      // dev convenience; production onboarding sets this true to force a rotation
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      departmentId: financeDept.id,
    },
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: "super_admin" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });
  console.log(`  ✓ Super Admin: ${admin.email}`);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
