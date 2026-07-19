import type { UseFormReturn } from "react-hook-form";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  MARITAL_STATUSES,
  type CreateEmployeeInput,
  type EmployeeReference,
} from "@ca/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ca/ui";

export interface Option {
  value: string;
  label: string;
}

/** "FULL_TIME" -> "Full time" */
export function humanize(value: string): string {
  const lower = value.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export const enumOptions = (values: readonly string[]): Option[] =>
  values.map((value) => ({ value, label: humanize(value) }));

export function SelectField({
  id,
  label,
  value,
  onChange,
  placeholder,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  options: Option[];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * The employee core-profile fields, shared by the create and edit screens so the
 * two can never drift apart.
 */
export function EmployeeProfileFields({
  form,
  reference,
}: {
  form: UseFormReturn<CreateEmployeeInput>;
  reference: EmployeeReference;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const setField = (field: keyof CreateEmployeeInput) => (value: string) =>
    setValue(field, value as never, { shouldDirty: true, shouldValidate: true });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="employeeCode">Employee code</Label>
            <Input id="employeeCode" placeholder="ASH-0022" {...register("employeeCode")} />
            {errors.employeeCode ? (
              <p className="text-xs text-destructive">{errors.employeeCode.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nationalId">National ID (CNIC)</Label>
            <Input id="nationalId" placeholder="00000-0000000-0" {...register("nationalId")} />
            {errors.nationalId ? (
              <p className="text-xs text-destructive">{errors.nationalId.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName ? (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName ? (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fatherName">Father&apos;s name</Label>
            <Input id="fatherName" {...register("fatherName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            {errors.dateOfBirth ? (
              <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
            ) : null}
          </div>
          <SelectField
            id="gender"
            label="Gender"
            value={watch("gender")}
            onChange={setField("gender")}
            options={enumOptions(GENDERS)}
          />
          <SelectField
            id="maritalStatus"
            label="Marital status"
            value={watch("maritalStatus")}
            onChange={setField("maritalStatus")}
            options={enumOptions(MARITAL_STATUSES)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="personalEmail">Personal email</Label>
            <Input id="personalEmail" type="email" {...register("personalEmail")} />
            {errors.personalEmail ? (
              <p className="text-xs text-destructive">{errors.personalEmail.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="personalPhone">Personal phone</Label>
            <Input id="personalPhone" placeholder="+92 300 0000000" {...register("personalPhone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Placement &amp; employment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="departmentId"
            label="Department"
            value={watch("departmentId")}
            onChange={setField("departmentId")}
            placeholder="Select a department…"
            options={reference.departments.map((d) => ({ value: d.id, label: d.name }))}
          />
          <SelectField
            id="designationId"
            label="Designation"
            value={watch("designationId")}
            onChange={setField("designationId")}
            placeholder="Select a designation…"
            options={reference.designations.map((d) => ({ value: d.id, label: d.name }))}
          />
          <SelectField
            id="branchId"
            label="Branch"
            value={watch("branchId")}
            onChange={setField("branchId")}
            placeholder="Select a branch…"
            options={reference.branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            id="reportsToId"
            label="Reports to"
            value={watch("reportsToId")}
            onChange={setField("reportsToId")}
            placeholder="Select a manager…"
            options={reference.managers.map((m) => ({
              value: m.id,
              label: `${m.name} · ${m.employeeCode}`,
            }))}
          />
          <SelectField
            id="employmentType"
            label="Employment type"
            value={watch("employmentType")}
            onChange={setField("employmentType")}
            options={enumOptions(EMPLOYMENT_TYPES)}
            error={errors.employmentType?.message}
          />
          <SelectField
            id="status"
            label="Status"
            value={watch("status")}
            onChange={setField("status")}
            options={enumOptions(EMPLOYEE_STATUSES)}
            error={errors.status?.message}
          />
          <div className="space-y-1.5">
            <Label htmlFor="dateOfJoining">Date of joining</Label>
            <Input id="dateOfJoining" type="date" {...register("dateOfJoining")} />
            {errors.dateOfJoining ? (
              <p className="text-xs text-destructive">{errors.dateOfJoining.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
