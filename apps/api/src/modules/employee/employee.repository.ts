import type { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export const employeeRepository = {
  findAll() {
    return prisma.employee.findMany({
      where: { deletedAt: null },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        branch: { select: { name: true } },
        reportsTo: { select: { firstName: true, lastName: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { employeeCode: "asc" },
    });
  },

  /** Full profile with every child collection. */
  findDetail(id: string) {
    return prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        branch: { select: { name: true } },
        reportsTo: { select: { firstName: true, lastName: true } },
        user: { select: { id: true, email: true } },
        emergencyContacts: { orderBy: { createdAt: "asc" } },
        education: { orderBy: { endYear: "desc" } },
        experience: { orderBy: { startDate: "desc" } },
        certifications: { orderBy: { issuedOn: "desc" } },
        skills: { orderBy: { name: "asc" } },
        medical: true,
        salary: true,
      },
    });
  },

  findByCode(employeeCode: string) {
    return prisma.employee.findUnique({ where: { employeeCode } });
  },

  findByNationalId(nationalId: string) {
    return prisma.employee.findUnique({ where: { nationalId } });
  },

  create(data: Prisma.EmployeeUncheckedCreateInput) {
    return prisma.employee.create({ data });
  },

  update(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return prisma.employee.update({ where: { id }, data });
  },

  upsertMedical(employeeId: string, data: Prisma.MedicalInfoUncheckedCreateInput) {
    const { employeeId: _ignored, ...rest } = data;
    return prisma.medicalInfo.upsert({
      where: { employeeId },
      update: rest,
      create: data,
    });
  },

  upsertSalary(employeeId: string, data: Prisma.SalaryInfoUncheckedCreateInput) {
    const { employeeId: _ignored, ...rest } = data;
    return prisma.salaryInfo.upsert({
      where: { employeeId },
      update: rest,
      create: data,
    });
  },

  listDepartments() {
    return prisma.department.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },

  listDesignations() {
    return prisma.designation.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },

  listBranches() {
    return prisma.branch.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },

  listManagers() {
    return prisma.employee.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: { employeeCode: "asc" },
    });
  },

  writeAudit(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data });
  },
};
