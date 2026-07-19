import {
  certificationSchema,
  educationSchema,
  emergencyContactSchema,
  experienceSchema,
  medicalSchema,
  salarySchema,
  skillSchema,
  type CreateEmployeeInput,
  type CreatedEmployee,
  type EmployeeCollection,
  type EmployeeDetail,
  type EmployeeListItem,
  type EmployeeReference,
  type EmployeeStatus,
  type EmploymentType,
  type Gender,
  type MaritalStatus,
  type MedicalInput,
  type SalaryInput,
  type SkillLevel,
} from "@ca/contracts";
import type { BloodGroup } from "@ca/contracts";
import { ConflictError, NotFoundError } from "../../core/errors";
import { prisma } from "../../core/db/prisma";
import { decryptField, encryptField } from "../../core/crypto/field-encryption";
import { employeeRepository } from "./employee.repository";

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** "YYYY-MM-DD" parsed as UTC midnight, so the server timezone can't shift it. */
function toDate(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  return trimmed ? new Date(`${trimmed}T00:00:00.000Z`) : null;
}

function dateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toYear(value: string | undefined): number | null {
  const trimmed = value?.trim();
  return trimmed ? Number(trimmed) : null;
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

/**
 * Child-collection handlers. One implementation per collection keeps the routes
 * generic — `/employees/:id/:collection` dispatches here rather than repeating
 * five near-identical CRUD endpoints.
 *
 * Every delete is scoped by employeeId as well as record id, so a record can
 * never be removed through a different employee's URL.
 */
const collectionHandlers: Record<
  EmployeeCollection,
  {
    create: (employeeId: string, raw: unknown) => Promise<{ id: string }>;
    remove: (employeeId: string, recordId: string) => Promise<{ count: number }>;
  }
> = {
  "emergency-contacts": {
    async create(employeeId, raw) {
      const input = emergencyContactSchema.parse(raw);
      return prisma.emergencyContact.create({
        data: {
          employeeId,
          name: input.name,
          relationship: input.relationship,
          phone: input.phone,
          altPhone: emptyToNull(input.altPhone),
          address: emptyToNull(input.address),
        },
        select: { id: true },
      });
    },
    remove: (employeeId, recordId) =>
      prisma.emergencyContact.deleteMany({ where: { id: recordId, employeeId } }),
  },

  education: {
    async create(employeeId, raw) {
      const input = educationSchema.parse(raw);
      return prisma.educationRecord.create({
        data: {
          employeeId,
          institution: input.institution,
          degree: input.degree,
          fieldOfStudy: emptyToNull(input.fieldOfStudy),
          startYear: toYear(input.startYear),
          endYear: toYear(input.endYear),
          grade: emptyToNull(input.grade),
        },
        select: { id: true },
      });
    },
    remove: (employeeId, recordId) =>
      prisma.educationRecord.deleteMany({ where: { id: recordId, employeeId } }),
  },

  experience: {
    async create(employeeId, raw) {
      const input = experienceSchema.parse(raw);
      const startDate = toDate(input.startDate);
      if (!startDate) throw new ConflictError("Start date is required.");
      const endDate = toDate(input.endDate);
      return prisma.experienceRecord.create({
        data: {
          employeeId,
          company: input.company,
          jobTitle: input.jobTitle,
          location: emptyToNull(input.location),
          startDate,
          endDate,
          isCurrent: !endDate,
          description: emptyToNull(input.description),
        },
        select: { id: true },
      });
    },
    remove: (employeeId, recordId) =>
      prisma.experienceRecord.deleteMany({ where: { id: recordId, employeeId } }),
  },

  certifications: {
    async create(employeeId, raw) {
      const input = certificationSchema.parse(raw);
      return prisma.certification.create({
        data: {
          employeeId,
          name: input.name,
          issuingBody: emptyToNull(input.issuingBody),
          credentialId: emptyToNull(input.credentialId),
          issuedOn: toDate(input.issuedOn),
          expiresOn: toDate(input.expiresOn),
        },
        select: { id: true },
      });
    },
    remove: (employeeId, recordId) =>
      prisma.certification.deleteMany({ where: { id: recordId, employeeId } }),
  },

  skills: {
    async create(employeeId, raw) {
      const input = skillSchema.parse(raw);
      const existing = await prisma.employeeSkill.findFirst({
        where: { employeeId, name: input.name },
        select: { id: true },
      });
      if (existing) throw new ConflictError("That skill is already listed.");
      return prisma.employeeSkill.create({
        data: {
          employeeId,
          name: input.name,
          level: input.level,
          years: input.years ? Number(input.years) : null,
        },
        select: { id: true },
      });
    },
    remove: (employeeId, recordId) =>
      prisma.employeeSkill.deleteMany({ where: { id: recordId, employeeId } }),
  },
};

export const employeeService = {
  async list(): Promise<EmployeeListItem[]> {
    const employees = await employeeRepository.findAll();

    return employees.map((employee) => ({
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: fullName(employee.firstName, employee.lastName),
      email: employee.user?.email ?? employee.personalEmail ?? null,
      phone: employee.personalPhone,
      department: employee.department?.name ?? null,
      designation: employee.designation?.name ?? null,
      branch: employee.branch?.name ?? null,
      reportsTo: employee.reportsTo
        ? fullName(employee.reportsTo.firstName, employee.reportsTo.lastName)
        : null,
      employmentType: employee.employmentType as EmploymentType,
      status: employee.status as EmployeeStatus,
      dateOfJoining: employee.dateOfJoining.toISOString(),
      hasPortalAccount: Boolean(employee.userId),
    }));
  },

  /** `canViewSalary` comes from the caller's payroll:view permission. */
  async detail(id: string, canViewSalary: boolean): Promise<EmployeeDetail> {
    const employee = await employeeRepository.findDetail(id);
    if (!employee) throw new NotFoundError("Employee");

    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      name: fullName(employee.firstName, employee.lastName),
      fatherName: employee.fatherName,
      dateOfBirth: dateOnly(employee.dateOfBirth),
      gender: employee.gender as Gender | null,
      maritalStatus: employee.maritalStatus as MaritalStatus | null,
      nationality: employee.nationality,
      nationalId: employee.nationalId,
      personalEmail: employee.personalEmail,
      personalPhone: employee.personalPhone,
      city: employee.city,
      country: employee.country,

      departmentId: employee.departmentId,
      designationId: employee.designationId,
      branchId: employee.branchId,
      reportsToId: employee.reportsToId,
      department: employee.department?.name ?? null,
      designation: employee.designation?.name ?? null,
      branch: employee.branch?.name ?? null,
      reportsTo: employee.reportsTo
        ? fullName(employee.reportsTo.firstName, employee.reportsTo.lastName)
        : null,

      employmentType: employee.employmentType as EmploymentType,
      status: employee.status as EmployeeStatus,
      dateOfJoining: dateOnly(employee.dateOfJoining) ?? "",
      hasPortalAccount: Boolean(employee.userId),
      portalEmail: employee.user?.email ?? null,

      emergencyContacts: employee.emergencyContacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone,
        altPhone: contact.altPhone ?? "",
        address: contact.address ?? "",
      })),
      education: employee.education.map((record) => ({
        id: record.id,
        institution: record.institution,
        degree: record.degree,
        fieldOfStudy: record.fieldOfStudy ?? "",
        startYear: record.startYear ? String(record.startYear) : "",
        endYear: record.endYear ? String(record.endYear) : "",
        grade: record.grade ?? "",
      })),
      experience: employee.experience.map((record) => ({
        id: record.id,
        company: record.company,
        jobTitle: record.jobTitle,
        location: record.location ?? "",
        startDate: dateOnly(record.startDate) ?? "",
        endDate: dateOnly(record.endDate) ?? "",
        description: record.description ?? "",
      })),
      certifications: employee.certifications.map((record) => ({
        id: record.id,
        name: record.name,
        issuingBody: record.issuingBody ?? "",
        credentialId: record.credentialId ?? "",
        issuedOn: dateOnly(record.issuedOn) ?? "",
        expiresOn: dateOnly(record.expiresOn) ?? "",
      })),
      skills: employee.skills.map((record) => ({
        id: record.id,
        name: record.name,
        level: record.level as SkillLevel,
        years: record.years ? String(record.years) : "",
      })),

      medical: employee.medical
        ? {
            bloodGroup: employee.medical.bloodGroup as BloodGroup,
            allergies: employee.medical.allergies ?? "",
            chronicConditions: employee.medical.chronicConditions ?? "",
            medications: employee.medical.medications ?? "",
            insuranceProvider: employee.medical.insuranceProvider ?? "",
            insuranceNumber: employee.medical.insuranceNumber ?? "",
            lastCheckupOn: dateOnly(employee.medical.lastCheckupOn) ?? "",
            notes: employee.medical.notes ?? "",
          }
        : null,

      // Compensation is withheld entirely unless the caller holds payroll:view.
      salary:
        canViewSalary && employee.salary
          ? {
              basicSalary: employee.salary.basicSalary.toString(),
              houseAllowance: employee.salary.houseAllowance.toString(),
              transportAllowance: employee.salary.transportAllowance.toString(),
              otherAllowance: employee.salary.otherAllowance.toString(),
              bankName: employee.salary.bankName ?? "",
              bankBranch: employee.salary.bankBranch ?? "",
              bankAccountNumber: employee.salary.bankAccountNumber
                ? decryptField(employee.salary.bankAccountNumber)
                : "",
              taxNumber: employee.salary.taxNumber ?? "",
              effectiveFrom: dateOnly(employee.salary.effectiveFrom) ?? "",
            }
          : null,
      canViewSalary,
    };
  },

  async reference(): Promise<EmployeeReference> {
    const [departments, designations, branches, managers] = await Promise.all([
      employeeRepository.listDepartments(),
      employeeRepository.listDesignations(),
      employeeRepository.listBranches(),
      employeeRepository.listManagers(),
    ]);

    return {
      departments,
      designations,
      branches,
      managers: managers.map((manager) => ({
        id: manager.id,
        name: fullName(manager.firstName, manager.lastName),
        employeeCode: manager.employeeCode,
      })),
    };
  },

  async create(input: CreateEmployeeInput, actorId: string): Promise<CreatedEmployee> {
    const employeeCode = input.employeeCode.trim();

    const existingCode = await employeeRepository.findByCode(employeeCode);
    if (existingCode) throw new ConflictError("That employee code is already in use.");

    const nationalId = emptyToNull(input.nationalId);
    if (nationalId) {
      const clash = await employeeRepository.findByNationalId(nationalId);
      if (clash) throw new ConflictError("An employee with that national ID already exists.");
    }

    const joiningDate = toDate(input.dateOfJoining);
    if (!joiningDate) throw new ConflictError("Date of joining is required.");

    const employee = await employeeRepository.create({
      employeeCode,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fatherName: emptyToNull(input.fatherName),
      dateOfBirth: toDate(input.dateOfBirth),
      gender: input.gender ?? null,
      maritalStatus: input.maritalStatus ?? null,
      nationality: emptyToNull(input.nationality),
      nationalId,
      personalEmail: emptyToNull(input.personalEmail),
      personalPhone: emptyToNull(input.personalPhone),
      city: emptyToNull(input.city),
      country: emptyToNull(input.country),
      departmentId: emptyToNull(input.departmentId),
      designationId: emptyToNull(input.designationId),
      branchId: emptyToNull(input.branchId),
      reportsToId: emptyToNull(input.reportsToId),
      employmentType: input.employmentType,
      status: input.status,
      dateOfJoining: joiningDate,
      createdById: actorId,
    });

    await employeeRepository.writeAudit({
      actorId,
      action: "CREATE",
      module: "employee",
      entityType: "Employee",
      entityId: employee.id,
      after: {
        employeeCode: employee.employeeCode,
        name: fullName(employee.firstName, employee.lastName),
        departmentId: employee.departmentId,
        status: employee.status,
      },
    });

    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: fullName(employee.firstName, employee.lastName),
    };
  },

  async update(id: string, input: CreateEmployeeInput, actorId: string): Promise<CreatedEmployee> {
    const current = await employeeRepository.findDetail(id);
    if (!current) throw new NotFoundError("Employee");

    const employeeCode = input.employeeCode.trim();
    if (employeeCode !== current.employeeCode) {
      const clash = await employeeRepository.findByCode(employeeCode);
      if (clash) throw new ConflictError("That employee code is already in use.");
    }

    const nationalId = emptyToNull(input.nationalId);
    if (nationalId && nationalId !== current.nationalId) {
      const clash = await employeeRepository.findByNationalId(nationalId);
      if (clash) throw new ConflictError("An employee with that national ID already exists.");
    }

    // An employee cannot be their own manager.
    const reportsToId = emptyToNull(input.reportsToId);
    if (reportsToId === id) throw new ConflictError("An employee cannot report to themselves.");

    const joiningDate = toDate(input.dateOfJoining);
    if (!joiningDate) throw new ConflictError("Date of joining is required.");

    const employee = await employeeRepository.update(id, {
      employeeCode,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fatherName: emptyToNull(input.fatherName),
      dateOfBirth: toDate(input.dateOfBirth),
      gender: input.gender ?? null,
      maritalStatus: input.maritalStatus ?? null,
      nationality: emptyToNull(input.nationality),
      nationalId,
      personalEmail: emptyToNull(input.personalEmail),
      personalPhone: emptyToNull(input.personalPhone),
      city: emptyToNull(input.city),
      country: emptyToNull(input.country),
      departmentId: emptyToNull(input.departmentId),
      designationId: emptyToNull(input.designationId),
      branchId: emptyToNull(input.branchId),
      reportsToId,
      employmentType: input.employmentType,
      status: input.status,
      dateOfJoining: joiningDate,
      updatedById: actorId,
    });

    await employeeRepository.writeAudit({
      actorId,
      action: "UPDATE",
      module: "employee",
      entityType: "Employee",
      entityId: id,
      before: { employeeCode: current.employeeCode, status: current.status },
      after: { employeeCode: employee.employeeCode, status: employee.status },
    });

    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: fullName(employee.firstName, employee.lastName),
    };
  },

  async addCollectionItem(
    employeeId: string,
    collection: EmployeeCollection,
    raw: unknown,
    actorId: string,
  ): Promise<{ id: string }> {
    const employee = await employeeRepository.findDetail(employeeId);
    if (!employee) throw new NotFoundError("Employee");

    const created = await collectionHandlers[collection].create(employeeId, raw);

    await employeeRepository.writeAudit({
      actorId,
      action: "CREATE",
      module: "employee",
      entityType: collection,
      entityId: created.id,
      after: { employeeId },
    });

    return created;
  },

  async removeCollectionItem(
    employeeId: string,
    collection: EmployeeCollection,
    recordId: string,
    actorId: string,
  ): Promise<void> {
    const result = await collectionHandlers[collection].remove(employeeId, recordId);
    if (result.count === 0) throw new NotFoundError("Record");

    await employeeRepository.writeAudit({
      actorId,
      action: "DELETE",
      module: "employee",
      entityType: collection,
      entityId: recordId,
      before: { employeeId },
    });
  },

  async saveMedical(employeeId: string, input: MedicalInput, actorId: string): Promise<void> {
    const employee = await employeeRepository.findDetail(employeeId);
    if (!employee) throw new NotFoundError("Employee");

    await employeeRepository.upsertMedical(employeeId, {
      employeeId,
      bloodGroup: input.bloodGroup,
      allergies: emptyToNull(input.allergies),
      chronicConditions: emptyToNull(input.chronicConditions),
      medications: emptyToNull(input.medications),
      insuranceProvider: emptyToNull(input.insuranceProvider),
      insuranceNumber: emptyToNull(input.insuranceNumber),
      lastCheckupOn: toDate(input.lastCheckupOn),
      notes: emptyToNull(input.notes),
    });

    // Medical detail is never copied into the audit payload.
    await employeeRepository.writeAudit({
      actorId,
      action: "UPDATE",
      module: "employee",
      entityType: "MedicalInfo",
      entityId: employeeId,
    });
  },

  async saveSalary(employeeId: string, input: SalaryInput, actorId: string): Promise<void> {
    const employee = await employeeRepository.findDetail(employeeId);
    if (!employee) throw new NotFoundError("Employee");

    const account = emptyToNull(input.bankAccountNumber);

    await employeeRepository.upsertSalary(employeeId, {
      employeeId,
      basicSalary: input.basicSalary || "0",
      houseAllowance: input.houseAllowance || "0",
      transportAllowance: input.transportAllowance || "0",
      otherAllowance: input.otherAllowance || "0",
      bankName: emptyToNull(input.bankName),
      bankBranch: emptyToNull(input.bankBranch),
      bankAccountNumber: account ? encryptField(account) : null,
      taxNumber: emptyToNull(input.taxNumber),
      effectiveFrom: toDate(input.effectiveFrom),
    });

    // Amounts and bank details are deliberately excluded from the audit payload.
    await employeeRepository.writeAudit({
      actorId,
      action: "UPDATE",
      module: "employee",
      entityType: "SalaryInfo",
      entityId: employeeId,
    });
  },
};
