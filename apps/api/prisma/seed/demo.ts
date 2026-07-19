import "dotenv/config";
import { prisma } from "../../src/core/db/prisma";
import { hashPassword } from "../../src/core/auth/password";

/**
 * SAMPLE DATA — development only. Never run against production.
 * Creates a representative Ashcon Engineering roster so tables, filters and
 * exports can be exercised with realistic volume.
 *   pnpm --filter @ca/api db:seed:demo
 */
const DEMO_PASSWORD = "Ashcon@2026";

interface DemoUser {
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string;
  departmentCode: "TECH" | "AO" | "FIN";
  roleKey: string;
  phone: string;
}

const DEMO_USERS: DemoUser[] = [
  { firstName: "Imran", lastName: "Sheikh", email: "imran.sheikh@ashcon.local", employeeCode: "ASH-0002", departmentCode: "AO", roleKey: "ceo", phone: "+92 300 1000002" },
  { firstName: "Nadia", lastName: "Qureshi", email: "nadia.qureshi@ashcon.local", employeeCode: "ASH-0003", departmentCode: "AO", roleKey: "managing_director", phone: "+92 300 1000003" },
  { firstName: "Bilal", lastName: "Ahmed", email: "bilal.ahmed@ashcon.local", employeeCode: "ASH-0004", departmentCode: "FIN", roleKey: "fact_manager", phone: "+92 300 1000004" },
  { firstName: "Sana", lastName: "Malik", email: "sana.malik@ashcon.local", employeeCode: "ASH-0005", departmentCode: "AO", roleKey: "ao_manager", phone: "+92 300 1000005" },
  { firstName: "Usman", lastName: "Raza", email: "usman.raza@ashcon.local", employeeCode: "ASH-0006", departmentCode: "TECH", roleKey: "project_manager", phone: "+92 300 1000006" },
  { firstName: "Hina", lastName: "Aslam", email: "hina.aslam@ashcon.local", employeeCode: "ASH-0007", departmentCode: "TECH", roleKey: "project_manager", phone: "+92 300 1000007" },
  { firstName: "Kamran", lastName: "Javed", email: "kamran.javed@ashcon.local", employeeCode: "ASH-0008", departmentCode: "TECH", roleKey: "tendering_billing_engineer", phone: "+92 300 1000008" },
  { firstName: "Ayesha", lastName: "Noor", email: "ayesha.noor@ashcon.local", employeeCode: "ASH-0009", departmentCode: "TECH", roleKey: "planning_costing_engineer", phone: "+92 300 1000009" },
  { firstName: "Faisal", lastName: "Khan", email: "faisal.khan@ashcon.local", employeeCode: "ASH-0010", departmentCode: "AO", roleKey: "procurement_inventory_officer", phone: "+92 300 1000010" },
  { firstName: "Zara", lastName: "Iqbal", email: "zara.iqbal@ashcon.local", employeeCode: "ASH-0011", departmentCode: "TECH", roleKey: "site_incharge", phone: "+92 300 1000011" },
  { firstName: "Tariq", lastName: "Mehmood", email: "tariq.mehmood@ashcon.local", employeeCode: "ASH-0012", departmentCode: "TECH", roleKey: "site_incharge", phone: "+92 300 1000012" },
  { firstName: "Saad", lastName: "Hussain", email: "saad.hussain@ashcon.local", employeeCode: "ASH-0013", departmentCode: "TECH", roleKey: "site_incharge", phone: "+92 300 1000013" },
  { firstName: "Maryam", lastName: "Siddiqui", email: "maryam.siddiqui@ashcon.local", employeeCode: "ASH-0014", departmentCode: "AO", roleKey: "admin_incharge", phone: "+92 300 1000014" },
  { firstName: "Omar", lastName: "Farooq", email: "omar.farooq@ashcon.local", employeeCode: "ASH-0015", departmentCode: "AO", roleKey: "admin_incharge", phone: "+92 300 1000015" },
  { firstName: "Rabia", lastName: "Anwar", email: "rabia.anwar@ashcon.local", employeeCode: "ASH-0016", departmentCode: "FIN", roleKey: "fact_manager", phone: "+92 300 1000016" },
  { firstName: "Hamza", lastName: "Yousaf", email: "hamza.yousaf@ashcon.local", employeeCode: "ASH-0017", departmentCode: "TECH", roleKey: "planning_costing_engineer", phone: "+92 300 1000017" },
  { firstName: "Fatima", lastName: "Zahid", email: "fatima.zahid@ashcon.local", employeeCode: "ASH-0018", departmentCode: "TECH", roleKey: "tendering_billing_engineer", phone: "+92 300 1000018" },
  { firstName: "Adnan", lastName: "Bashir", email: "adnan.bashir@ashcon.local", employeeCode: "ASH-0019", departmentCode: "AO", roleKey: "procurement_inventory_officer", phone: "+92 300 1000019" },
  { firstName: "Sadia", lastName: "Rehman", email: "sadia.rehman@ashcon.local", employeeCode: "ASH-0020", departmentCode: "FIN", roleKey: "admin_incharge", phone: "+92 300 1000020" },
];

async function main(): Promise<void> {
  console.log("Seeding SAMPLE staff (development only)…");

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const departments = await prisma.department.findMany();
  const roles = await prisma.role.findMany();

  const departmentByCode = new Map(departments.map((d) => [d.code, d.id]));
  const roleByKey = new Map(roles.map((r) => [r.key, r.id]));

  let created = 0;
  for (const demo of DEMO_USERS) {
    const roleId = roleByKey.get(demo.roleKey);
    if (!roleId) {
      console.warn(`  ! unknown role ${demo.roleKey} — skipping ${demo.email}`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        email: demo.email,
        passwordHash,
        firstName: demo.firstName,
        lastName: demo.lastName,
        employeeCode: demo.employeeCode,
        phone: demo.phone,
        status: "ACTIVE",
        mustChangePassword: true,
        departmentId: departmentByCode.get(demo.departmentCode) ?? null,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
    created += 1;
  }

  const total = await prisma.user.count();
  console.log(`  ✓ ${created} sample users ensured (${total} users total)`);

  // ── Employee profiles for every portal account ──────────────────────────
  const usersWithoutProfile = await prisma.user.findMany({
    where: { employee: null, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      employeeCode: true,
      departmentId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const headOffice = await prisma.branch.findUnique({ where: { code: "HO" } });
  const TYPES = ["FULL_TIME", "FULL_TIME", "FULL_TIME", "CONTRACT", "PROBATION"] as const;

  let profiles = 0;
  for (const [index, user] of usersWithoutProfile.entries()) {
    // Spread joining dates across recent years so date sorting is meaningful.
    const joining = new Date(Date.UTC(2019 + (index % 6), index % 12, ((index * 3) % 27) + 1));

    await prisma.employee.create({
      data: {
        employeeCode: user.employeeCode ?? `ASH-T${String(index + 1).padStart(4, "0")}`,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        personalPhone: user.phone,
        departmentId: user.departmentId,
        branchId: headOffice?.id ?? null,
        employmentType: TYPES[index % TYPES.length],
        status: "ACTIVE",
        dateOfJoining: joining,
        country: "Pakistan",
      },
    });
    profiles += 1;
  }

  const employeeTotal = await prisma.employee.count();
  console.log(`  ✓ ${profiles} employee profiles created (${employeeTotal} employees total)`);

  // ── Designations + reporting lines ──────────────────────────────────────
  // Only fills gaps, so re-running never overwrites real data.
  const designations = await prisma.designation.findMany({
    select: { id: true, departmentId: true },
  });
  const byDepartment = new Map<string, string[]>();
  for (const designation of designations) {
    if (!designation.departmentId) continue;
    const list = byDepartment.get(designation.departmentId) ?? [];
    list.push(designation.id);
    byDepartment.set(designation.departmentId, list);
  }

  // Department heads: FACT Manager (FIN), AO Manager (AO), Project Manager (TECH).
  const heads = new Map<string, string>();
  for (const code of ["ASH-0004", "ASH-0005", "ASH-0006"]) {
    const head = await prisma.employee.findUnique({
      where: { employeeCode: code },
      select: { id: true, departmentId: true },
    });
    if (head?.departmentId) heads.set(head.departmentId, head.id);
  }
  const ceo = await prisma.employee.findUnique({
    where: { employeeCode: "ASH-0002" },
    select: { id: true },
  });

  const toFill = await prisma.employee.findMany({
    where: { deletedAt: null, OR: [{ designationId: null }, { reportsToId: null }] },
    select: { id: true, departmentId: true, designationId: true, reportsToId: true },
    orderBy: { employeeCode: "asc" },
  });

  let filled = 0;
  for (const [index, employee] of toFill.entries()) {
    const pool = employee.departmentId ? (byDepartment.get(employee.departmentId) ?? []) : [];
    const designationId =
      employee.designationId ?? (pool.length > 0 ? pool[index % pool.length] : null);

    const head = employee.departmentId ? heads.get(employee.departmentId) : undefined;
    // Heads report to the CEO; everyone else to their department head.
    const manager = head && head !== employee.id ? head : (ceo?.id ?? null);
    const reportsToId = employee.reportsToId ?? (manager === employee.id ? null : manager);

    if (designationId === employee.designationId && reportsToId === employee.reportsToId) continue;
    await prisma.employee.update({
      where: { id: employee.id },
      data: { designationId, reportsToId },
    });
    filled += 1;
  }
  console.log(`  ✓ ${filled} employees given a designation and reporting line`);
}

main()
  .catch((err) => {
    console.error("Demo seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
