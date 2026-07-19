import type { PrismaClient } from "@prisma/client";

interface LeaveTypeSeed {
  code: string;
  name: string;
  daysPerYear: string;
  isPaid?: boolean;
  carryForward?: boolean;
  maxCarryForward?: string;
  colour?: string;
}

const LEAVE_TYPES: LeaveTypeSeed[] = [
  { code: "AL", name: "Annual Leave", daysPerYear: "14", carryForward: true, maxCarryForward: "7", colour: "#11479B" },
  { code: "CL", name: "Casual Leave", daysPerYear: "10", colour: "#0EA5E9" },
  { code: "SL", name: "Sick Leave", daysPerYear: "8", colour: "#F59E0B" },
  { code: "ML", name: "Maternity Leave", daysPerYear: "90", colour: "#EC4899" },
  { code: "PL", name: "Paternity Leave", daysPerYear: "7", colour: "#8B5CF6" },
  { code: "UL", name: "Unpaid Leave", daysPerYear: "0", isPaid: false, colour: "#64748B" },
];

/**
 * Fixed-date national holidays only.
 *
 * Pakistan's religious holidays (Eid ul-Fitr, Eid ul-Adha, Ashura, Eid Milad
 * un-Nabi) depend on moon sighting and are announced each year, so they are
 * deliberately NOT seeded — an administrator adds them annually. Seeding
 * guessed dates would silently corrupt leave day-counts.
 */
const FIXED_HOLIDAYS = [
  { name: "Kashmir Solidarity Day", month: 2, day: 5 },
  { name: "Pakistan Day", month: 3, day: 23 },
  { name: "Labour Day", month: 5, day: 1 },
  { name: "Independence Day", month: 8, day: 14 },
  { name: "Iqbal Day", month: 11, day: 9 },
  { name: "Quaid-e-Azam Day / Christmas", month: 12, day: 25 },
];

export async function seedHrReference(prisma: PrismaClient): Promise<void> {
  for (const type of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { code: type.code },
      update: {},
      create: {
        code: type.code,
        name: type.name,
        daysPerYear: type.daysPerYear,
        isPaid: type.isPaid ?? true,
        carryForward: type.carryForward ?? false,
        maxCarryForward: type.maxCarryForward ?? "0",
        colour: type.colour ?? null,
      },
    });
  }
  console.log(`  ✓ ${LEAVE_TYPES.length} leave types`);

  const year = new Date().getUTCFullYear();
  for (const holiday of FIXED_HOLIDAYS) {
    const date = new Date(Date.UTC(year, holiday.month - 1, holiday.day));
    await prisma.holiday.upsert({
      where: { date_name: { date, name: holiday.name } },
      update: {},
      create: {
        name: holiday.name,
        date,
        isRecurring: true,
        description: "Fixed-date national holiday.",
      },
    });
  }
  console.log(
    `  ✓ ${FIXED_HOLIDAYS.length} fixed national holidays for ${year} (moon-dependent Eid/Ashura dates must be added by an admin)`,
  );
}
