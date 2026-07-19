import { z } from "zod";
import type { EmployeeStatus, EmploymentType, Gender, MaritalStatus } from "./employee";

export const BLOOD_GROUPS = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
  "UNKNOWN",
] as const;

export const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type SkillLevel = (typeof SKILL_LEVELS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const optionalText = (max: number) => z.string().trim().max(max).optional();

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || DATE_PATTERN.test(v), "Use the date picker (YYYY-MM-DD)")
  .optional();

const requiredDate = (message: string) =>
  z.string().trim().min(1, message).regex(DATE_PATTERN, "Use the date picker (YYYY-MM-DD)");

const optionalYear = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}$/.test(v), "Enter a 4-digit year")
  .optional();

const optionalCount = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,2}$/.test(v), "Enter a whole number")
  .optional();

/** Money arrives as a string from the form; the service converts to Decimal. */
const optionalAmount = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,12}(\.\d{1,2})?$/.test(v), "Enter a valid amount")
  .optional();

// ── Child collections ───────────────────────────────────────────────────────

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  relationship: z.string().trim().min(1, "Relationship is required").max(40),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  altPhone: optionalText(30),
  address: optionalText(200),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(120),
  degree: z.string().trim().min(1, "Degree is required").max(120),
  fieldOfStudy: optionalText(120),
  startYear: optionalYear,
  endYear: optionalYear,
  grade: optionalText(40),
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120),
  jobTitle: z.string().trim().min(1, "Job title is required").max(120),
  location: optionalText(120),
  startDate: requiredDate("Start date is required"),
  endDate: optionalDate,
  description: optionalText(500),
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Certification name is required").max(120),
  issuingBody: optionalText(120),
  credentialId: optionalText(80),
  issuedOn: optionalDate,
  expiresOn: optionalDate,
});

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Skill is required").max(60),
  level: z.enum(SKILL_LEVELS),
  years: optionalCount,
});

export const medicalSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  allergies: optionalText(300),
  chronicConditions: optionalText(300),
  medications: optionalText(300),
  insuranceProvider: optionalText(120),
  insuranceNumber: optionalText(80),
  lastCheckupOn: optionalDate,
  notes: optionalText(500),
});

export const salarySchema = z.object({
  basicSalary: optionalAmount,
  houseAllowance: optionalAmount,
  transportAllowance: optionalAmount,
  otherAllowance: optionalAmount,
  bankName: optionalText(120),
  bankBranch: optionalText(120),
  bankAccountNumber: optionalText(60),
  taxNumber: optionalText(60),
  effectiveFrom: optionalDate,
});

export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type MedicalInput = z.infer<typeof medicalSchema>;
export type SalaryInput = z.infer<typeof salarySchema>;

/** Collection slugs used in `/api/employees/:id/:collection`. */
export const EMPLOYEE_COLLECTIONS = [
  "emergency-contacts",
  "education",
  "experience",
  "certifications",
  "skills",
] as const;
export type EmployeeCollection = (typeof EMPLOYEE_COLLECTIONS)[number];

// ── Detail response ─────────────────────────────────────────────────────────

export interface EmergencyContactRecord extends EmergencyContactInput {
  id: string;
}
export interface EducationRecordItem extends EducationInput {
  id: string;
}
export interface ExperienceRecordItem extends ExperienceInput {
  id: string;
}
export interface CertificationRecordItem extends CertificationInput {
  id: string;
}
export interface SkillRecordItem extends SkillInput {
  id: string;
}

export interface EmployeeDetail {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  name: string;
  fatherName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  nationality: string | null;
  nationalId: string | null;
  personalEmail: string | null;
  personalPhone: string | null;
  city: string | null;
  country: string | null;

  departmentId: string | null;
  designationId: string | null;
  branchId: string | null;
  reportsToId: string | null;
  department: string | null;
  designation: string | null;
  branch: string | null;
  reportsTo: string | null;

  employmentType: EmploymentType;
  status: EmployeeStatus;
  dateOfJoining: string;
  hasPortalAccount: boolean;
  portalEmail: string | null;

  emergencyContacts: EmergencyContactRecord[];
  education: EducationRecordItem[];
  experience: ExperienceRecordItem[];
  certifications: CertificationRecordItem[];
  skills: SkillRecordItem[];
  medical: MedicalInput | null;
  /** Omitted entirely unless the caller holds payroll:view. */
  salary: SalaryInput | null;
  canViewSalary: boolean;
}
