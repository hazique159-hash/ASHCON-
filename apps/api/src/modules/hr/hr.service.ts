import type {
  AttendanceItem,
  AttendanceStatus,
  CreateHolidayInput,
  CreateLeaveRequestInput,
  DecideLeaveInput,
  HolidayItem,
  HrReference,
  LeaveBalanceItem,
  LeaveDayPreview,
  LeaveRequestItem,
  LeaveStatus,
  MarkAttendanceInput,
} from "@ca/contracts";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors";
import { prisma } from "../../core/db/prisma";

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

function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

/**
 * Weekend configuration, as JS day indices (0 = Sunday).
 *
 * Defaults to Saturday + Sunday but is overridable per deployment — site-based
 * contractors frequently work a six-day week, which changes every leave count.
 */
async function weekendDayIndices(): Promise<Set<number>> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "hr.weekendDays" } });
  const value = setting?.value;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) {
    return new Set(value as number[]);
  }
  return new Set([0, 6]);
}

function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

/**
 * Working days between two dates, excluding weekends and public holidays.
 * This is the number that drives entitlement, so it is always derived here and
 * never accepted from the client.
 */
async function computeWorkingDays(start: Date, end: Date): Promise<LeaveDayPreview> {
  const [weekend, holidays] = await Promise.all([
    weekendDayIndices(),
    prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, name: true },
    }),
  ]);

  const holidayByIso = new Map(holidays.map((holiday) => [dateOnly(holiday.date), holiday.name]));

  let workingDays = 0;
  let weekendDays = 0;
  const holidaysHit: { date: string; name: string }[] = [];

  for (const day of eachDayInclusive(start, end)) {
    if (weekend.has(day.getUTCDay())) {
      weekendDays += 1;
      continue;
    }
    const iso = dateOnly(day);
    const holidayName = holidayByIso.get(iso);
    if (holidayName) {
      // A holiday falling on a working day is not deducted from entitlement.
      holidaysHit.push({ date: iso, name: holidayName });
      continue;
    }
    workingDays += 1;
  }

  return {
    workingDays: workingDays.toFixed(2),
    weekendDays,
    holidayDays: holidaysHit.length,
    holidaysHit,
  };
}

async function ensureBalance(employeeId: string, leaveTypeId: string, year: number) {
  const existing = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
  if (existing) return existing;

  const leaveType = await prisma.leaveType.findUniqueOrThrow({ where: { id: leaveTypeId } });
  return prisma.leaveBalance.create({
    data: { employeeId, leaveTypeId, year, entitled: leaveType.daysPerYear, carried: "0", taken: "0" },
  });
}

export const hrService = {
  async reference(): Promise<HrReference> {
    const [employees, leaveTypes] = await Promise.all([
      prisma.employee.findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
        orderBy: { employeeCode: "asc" },
      }),
      prisma.leaveType.findMany({
        where: { active: true },
        select: { id: true, code: true, name: true, daysPerYear: true, isPaid: true },
        orderBy: { code: "asc" },
      }),
    ]);

    return {
      employees: employees.map((employee) => ({
        id: employee.id,
        name: fullName(employee.firstName, employee.lastName),
        employeeCode: employee.employeeCode,
      })),
      leaveTypes: leaveTypes.map((type) => ({
        id: type.id,
        code: type.code,
        name: type.name,
        daysPerYear: type.daysPerYear.toString(),
        isPaid: type.isPaid,
      })),
    };
  },

  previewDays(startDate: string, endDate: string): Promise<LeaveDayPreview> {
    const start = toDate(startDate);
    const end = toDate(endDate);
    if (end < start) throw new BadRequestError("End date cannot be before the start date.");
    return computeWorkingDays(start, end);
  },

  async listLeaveRequests(): Promise<LeaveRequestItem[]> {
    const requests = await prisma.leaveRequest.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { name: true, code: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });

    return requests.map((request) => ({
      id: request.id,
      requestNumber: request.requestNumber,
      employeeId: request.employeeId,
      employeeName: fullName(request.employee.firstName, request.employee.lastName),
      employeeCode: request.employee.employeeCode,
      leaveType: request.leaveType.name,
      leaveTypeCode: request.leaveType.code,
      startDate: dateOnly(request.startDate),
      endDate: dateOnly(request.endDate),
      days: request.days.toString(),
      isHalfDay: request.isHalfDay,
      reason: request.reason,
      status: request.status as LeaveStatus,
      decidedAt: request.decidedAt ? request.decidedAt.toISOString() : null,
      decisionNote: request.decisionNote,
    }));
  },

  async balancesFor(employeeId: string): Promise<LeaveBalanceItem[]> {
    const year = new Date().getUTCFullYear();
    const leaveTypes = await prisma.leaveType.findMany({ where: { active: true }, orderBy: { code: "asc" } });

    const balances: LeaveBalanceItem[] = [];
    for (const leaveType of leaveTypes) {
      const balance = await ensureBalance(employeeId, leaveType.id, year);
      const available =
        Number(balance.entitled) + Number(balance.carried) - Number(balance.taken);
      balances.push({
        leaveTypeId: leaveType.id,
        leaveTypeCode: leaveType.code,
        leaveType: leaveType.name,
        year,
        entitled: balance.entitled.toString(),
        carried: balance.carried.toString(),
        taken: balance.taken.toString(),
        available: available.toFixed(2),
      });
    }
    return balances;
  },

  /**
   * Creates a leave request. Days are derived from the calendar, and a paid
   * request that exceeds the remaining balance is refused up front rather than
   * discovered at approval time.
   */
  async createLeaveRequest(input: CreateLeaveRequestInput, actorId: string) {
    const start = toDate(input.startDate);
    const end = toDate(input.endDate);

    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new NotFoundError("Employee");

    const leaveType = await prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } });
    if (!leaveType || !leaveType.active) throw new BadRequestError("That leave type is unavailable.");

    const preview = await computeWorkingDays(start, end);
    const days = input.isHalfDay ? 0.5 : Number(preview.workingDays);
    if (days <= 0) {
      throw new BadRequestError(
        "That range contains no working days — it falls entirely on weekends or holidays.",
      );
    }

    // Overlapping requests would double-count entitlement.
    const clash = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { requestNumber: true },
    });
    if (clash) {
      throw new ConflictError(`That range overlaps existing request ${clash.requestNumber}.`);
    }

    const year = start.getUTCFullYear();
    const balance = await ensureBalance(employee.id, leaveType.id, year);
    const available = Number(balance.entitled) + Number(balance.carried) - Number(balance.taken);
    if (leaveType.isPaid && days > available) {
      throw new ConflictError(
        `Only ${available.toFixed(2)} day(s) of ${leaveType.name} remain; ${days.toFixed(2)} requested.`,
      );
    }

    const prefix = `LV-${start.toISOString().slice(0, 7).replace("-", "")}-`;
    const used = await prisma.leaveRequest.count({ where: { requestNumber: { startsWith: prefix } } });
    const requestNumber = `${prefix}${String(used + 1).padStart(4, "0")}`;

    const request = await prisma.leaveRequest.create({
      data: {
        requestNumber,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate: start,
        endDate: end,
        days: days.toFixed(2),
        isHalfDay: input.isHalfDay ?? false,
        reason: input.reason.trim(),
        status: leaveType.requiresApproval ? "PENDING" : "APPROVED",
        createdById: actorId,
      },
    });

    // Auto-approved types deduct immediately.
    if (!leaveType.requiresApproval) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { taken: (Number(balance.taken) + days).toFixed(2) },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action: "CREATE",
        module: "hr",
        entityType: "LeaveRequest",
        entityId: request.id,
        after: { requestNumber, days: days.toFixed(2), status: request.status },
      },
    });

    return {
      id: request.id,
      requestNumber,
      days: days.toFixed(2),
      status: request.status as LeaveStatus,
      preview,
    };
  },

  /** Approving deducts the balance; rejecting leaves it untouched. */
  async decideLeaveRequest(id: string, input: DecideLeaveInput, actorId: string) {
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError("Leave request");
    if (request.status !== "PENDING") {
      throw new ConflictError(`That request is already ${request.status.toLowerCase()}.`);
    }

    if (input.decision === "APPROVED") {
      const year = request.startDate.getUTCFullYear();
      const balance = await ensureBalance(request.employeeId, request.leaveTypeId, year);
      const available = Number(balance.entitled) + Number(balance.carried) - Number(balance.taken);
      const days = Number(request.days);
      const leaveType = await prisma.leaveType.findUniqueOrThrow({ where: { id: request.leaveTypeId } });

      // Re-check at decision time; other requests may have consumed the balance.
      if (leaveType.isPaid && days > available) {
        throw new ConflictError(
          `Balance no longer sufficient: ${available.toFixed(2)} day(s) remain, ${days.toFixed(2)} requested.`,
        );
      }

      await prisma.$transaction([
        prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { taken: (Number(balance.taken) + days).toFixed(2) },
        }),
        prisma.leaveRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            approverId: actorId,
            decidedAt: new Date(),
            decisionNote: emptyToNull(input.note),
          },
        }),
      ]);
    } else {
      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          approverId: actorId,
          decidedAt: new Date(),
          decisionNote: emptyToNull(input.note),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId,
        action: input.decision,
        module: "hr",
        entityType: "LeaveRequest",
        entityId: id,
        after: { requestNumber: request.requestNumber, decision: input.decision },
      },
    });

    return { id, requestNumber: request.requestNumber, status: input.decision as LeaveStatus };
  },

  async listAttendance(date?: string): Promise<AttendanceItem[]> {
    const where = date ? { date: toDate(date) } : {};
    const records = await prisma.attendanceRecord.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ date: "desc" }, { employeeId: "asc" }],
      take: 300,
    });

    return records.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: fullName(record.employee.firstName, record.employee.lastName),
      employeeCode: record.employee.employeeCode,
      date: dateOnly(record.date),
      status: record.status as AttendanceStatus,
      checkIn: record.checkIn ? record.checkIn.toISOString().slice(11, 16) : null,
      checkOut: record.checkOut ? record.checkOut.toISOString().slice(11, 16) : null,
      workedHours: record.workedHours ? record.workedHours.toString() : null,
      notes: record.notes,
    }));
  },

  /** Idempotent per employee/day — re-marking updates the existing record. */
  async markAttendance(input: MarkAttendanceInput, actorId: string) {
    const date = toDate(input.date);
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) throw new NotFoundError("Employee");

    const checkIn = input.checkIn ? new Date(`${input.date}T${input.checkIn}:00.000Z`) : null;
    const checkOut = input.checkOut ? new Date(`${input.date}T${input.checkOut}:00.000Z`) : null;
    if (checkIn && checkOut && checkOut <= checkIn) {
      throw new BadRequestError("Check-out must be after check-in.");
    }
    const workedHours =
      checkIn && checkOut ? ((checkOut.getTime() - checkIn.getTime()) / 3_600_000).toFixed(2) : null;

    const record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: employee.id, date } },
      update: {
        status: input.status,
        checkIn,
        checkOut,
        workedHours,
        notes: emptyToNull(input.notes),
        markedById: actorId,
      },
      create: {
        employeeId: employee.id,
        date,
        status: input.status,
        checkIn,
        checkOut,
        workedHours,
        notes: emptyToNull(input.notes),
        source: "MANUAL",
        markedById: actorId,
      },
    });

    return { id: record.id, date: dateOnly(record.date), status: record.status as AttendanceStatus };
  },

  async listHolidays(): Promise<HolidayItem[]> {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
    return holidays.map((holiday) => ({
      id: holiday.id,
      name: holiday.name,
      date: dateOnly(holiday.date),
      description: holiday.description,
      isRecurring: holiday.isRecurring,
    }));
  },

  async createHoliday(input: CreateHolidayInput, actorId: string) {
    const date = toDate(input.date);
    const existing = await prisma.holiday.findFirst({ where: { date, name: input.name.trim() } });
    if (existing) throw new ConflictError("That holiday already exists on that date.");

    const holiday = await prisma.holiday.create({
      data: {
        name: input.name.trim(),
        date,
        description: emptyToNull(input.description),
        createdById: actorId,
      },
    });
    return { id: holiday.id, name: holiday.name, date: dateOnly(holiday.date) };
  },
};
