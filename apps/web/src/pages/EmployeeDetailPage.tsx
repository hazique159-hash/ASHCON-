import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  BLOOD_GROUPS,
  SKILL_LEVELS,
  createEmployeeSchema,
  medicalSchema,
  salarySchema,
  type CreateEmployeeInput,
  type EmployeeCollection,
  type EmployeeDetail,
  type EmployeeReference,
  type MedicalInput,
  type SalaryInput,
} from "@ca/contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormShell,
  Input,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@ca/ui";
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "../core/api/client";
import {
  EmployeeProfileFields,
  SelectField,
  enumOptions,
  humanize,
} from "../components/EmployeeProfileFields";
import { CollectionSection } from "../components/CollectionSection";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "ON_LEAVE":
      return "warning";
    case "SUSPENDED":
      return "destructive";
    default:
      return "secondary";
  }
}

/* ────────────────────────── Medical ────────────────────────── */

function MedicalForm({
  employeeId,
  initial,
  onSaved,
}: {
  employeeId: string;
  initial: MedicalInput | null;
  onSaved: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const form = useForm<MedicalInput>({
    resolver: zodResolver(medicalSchema),
    defaultValues: initial ?? {
      bloodGroup: "UNKNOWN",
      allergies: "",
      chronicConditions: "",
      medications: "",
      insuranceProvider: "",
      insuranceNumber: "",
      lastCheckupOn: "",
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = form;

  const submit = async (values: MedicalInput) => {
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/employees/${employeeId}/profile/medical`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save medical information.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {saved ? (
            <Alert variant="success">
              <AlertDescription>Medical information saved.</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="bloodGroup"
              label="Blood group"
              value={watch("bloodGroup")}
              onChange={(value) =>
                setValue("bloodGroup", value as MedicalInput["bloodGroup"], { shouldDirty: true })
              }
              options={enumOptions(BLOOD_GROUPS).map((option) => ({
                ...option,
                label: option.label.replace(" positive", " +").replace(" negative", " −"),
              }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="lastCheckupOn">Last check-up</Label>
              <Input id="lastCheckupOn" type="date" {...register("lastCheckupOn")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insuranceProvider">Insurance provider</Label>
              <Input id="insuranceProvider" {...register("insuranceProvider")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insuranceNumber">Policy number</Label>
              <Input id="insuranceNumber" {...register("insuranceNumber")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea id="allergies" rows={2} {...register("allergies")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="chronicConditions">Chronic conditions</Label>
              <Textarea id="chronicConditions" rows={2} {...register("chronicConditions")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save />}
            Save medical
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────── Salary ────────────────────────── */

function SalaryForm({
  employeeId,
  initial,
  onSaved,
}: {
  employeeId: string;
  initial: SalaryInput | null;
  onSaved: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const form = useForm<SalaryInput>({
    resolver: zodResolver(salarySchema),
    defaultValues: initial ?? {
      basicSalary: "",
      houseAllowance: "",
      transportAllowance: "",
      otherAllowance: "",
      bankName: "",
      bankBranch: "",
      bankAccountNumber: "",
      taxNumber: "",
      effectiveFrom: "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const total = ["basicSalary", "houseAllowance", "transportAllowance", "otherAllowance"]
    .map((field) => Number(watch(field as keyof SalaryInput) || 0))
    .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  const submit = async (values: SalaryInput) => {
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/employees/${employeeId}/profile/salary`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save salary information.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary &amp; bank details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {saved ? (
            <Alert variant="success">
              <AlertDescription>Salary information saved.</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["basicSalary", "Basic salary"],
                ["houseAllowance", "House allowance"],
                ["transportAllowance", "Transport allowance"],
                ["otherAllowance", "Other allowance"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field}>{label} (PKR)</Label>
                <Input id={field} inputMode="decimal" placeholder="0.00" {...register(field)} />
                {errors[field] ? (
                  <p className="text-xs text-destructive">{errors[field]?.message}</p>
                ) : null}
              </div>
            ))}

            <div className="space-y-1.5 sm:col-span-2">
              <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                Gross monthly:{" "}
                <span className="font-semibold">
                  PKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank</Label>
              <Input id="bankName" {...register("bankName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankBranch">Branch</Label>
              <Input id="bankBranch" {...register("bankBranch")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccountNumber">Account number</Label>
              <Input id="bankAccountNumber" {...register("bankAccountNumber")} />
              <p className="text-xs text-muted-foreground">Encrypted at rest (AES-256-GCM).</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxNumber">Tax number</Label>
              <Input id="taxNumber" {...register("taxNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effectiveFrom">Effective from</Label>
              <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save />}
            Save salary
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ────────────────────────── Page ────────────────────────── */

export function EmployeeDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = React.useState<EmployeeDetail | null>(null);
  const [reference, setReference] = React.useState<EmployeeReference>({
    departments: [],
    designations: [],
    branches: [],
    managers: [],
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  const form = useForm<CreateEmployeeInput>({ resolver: zodResolver(createEmployeeSchema) });
  const {
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = form;

  const applyDetail = React.useCallback(
    (data: EmployeeDetail) => {
      setDetail(data);
      reset({
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        fatherName: data.fatherName ?? "",
        dateOfBirth: data.dateOfBirth ?? "",
        gender: data.gender ?? undefined,
        maritalStatus: data.maritalStatus ?? undefined,
        nationality: data.nationality ?? "",
        nationalId: data.nationalId ?? "",
        personalEmail: data.personalEmail ?? "",
        personalPhone: data.personalPhone ?? "",
        city: data.city ?? "",
        country: data.country ?? "",
        departmentId: data.departmentId ?? "",
        designationId: data.designationId ?? "",
        branchId: data.branchId ?? "",
        reportsToId: data.reportsToId ?? "",
        employmentType: data.employmentType,
        status: data.status,
        dateOfJoining: data.dateOfJoining,
      });
    },
    [reset],
  );

  const load = React.useCallback(async () => {
    const data = await apiFetch<EmployeeDetail>(`/employees/${id}`);
    applyDetail(data);
  }, [id, applyDetail]);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      apiFetch<EmployeeDetail>(`/employees/${id}`),
      apiFetch<EmployeeReference>("/employees/reference"),
    ])
      .then(([detailData, referenceData]) => {
        if (cancelled) return;
        applyDetail(detailData);
        setReference(referenceData);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load this employee.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, applyDetail]);

  const onSubmit = async (values: CreateEmployeeInput) => {
    setSaveError(null);
    try {
      await apiFetch(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(values) });
      await load();
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save changes.");
    }
  };

  const addTo = (collection: EmployeeCollection) => async (values: Record<string, string>) => {
    await apiFetch(`/employees/${id}/${collection}`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    await load();
  };

  const removeFrom = (collection: EmployeeCollection) => async (recordId: string) => {
    await apiFetch(`/employees/${id}/${collection}/${recordId}`, { method: "DELETE" });
    await load();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError ?? "Employee not found."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.employeeCode}
            {detail.designation ? ` · ${detail.designation}` : ""}
            {detail.department ? ` · ${detail.department}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(detail.status)}>{humanize(detail.status)}</Badge>
          <Badge variant="secondary">{humanize(detail.employmentType)}</Badge>
          {detail.hasPortalAccount ? <Badge variant="outline">Portal account</Badge> : null}
          <Button variant="outline" onClick={() => navigate("/employee")}>
            Back
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-2 flex w-full flex-wrap justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="emergency">Emergency ({detail.emergencyContacts.length})</TabsTrigger>
          <TabsTrigger value="education">Education ({detail.education.length})</TabsTrigger>
          <TabsTrigger value="experience">Experience ({detail.experience.length})</TabsTrigger>
          <TabsTrigger value="certifications">
            Certifications ({detail.certifications.length})
          </TabsTrigger>
          <TabsTrigger value="skills">Skills ({detail.skills.length})</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          {detail.canViewSalary ? <TabsTrigger value="salary">Salary</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="profile">
          <FormShell
            title="Profile"
            description="Core personnel details and placement."
            onSubmit={handleSubmit(onSubmit)}
            onReset={() => reset()}
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            submitLabel="Save changes"
            error={saveError}
          >
            <EmployeeProfileFields form={form} reference={reference} />
            {savedAt ? (
              <Alert variant="success">
                <AlertDescription>
                  Saved at {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                </AlertDescription>
              </Alert>
            ) : null}
          </FormShell>
        </TabsContent>

        <TabsContent value="emergency">
          <CollectionSection
            title="Emergency contacts"
            description="Who to call in an emergency."
            items={detail.emergencyContacts}
            columns={[
              { key: "name", label: "Name" },
              { key: "relationship", label: "Relationship" },
              { key: "phone", label: "Phone" },
              { key: "altPhone", label: "Alt. phone" },
            ]}
            fields={[
              { name: "name", label: "Name" },
              { name: "relationship", label: "Relationship", placeholder: "Spouse, Father…" },
              { name: "phone", label: "Phone" },
              { name: "altPhone", label: "Alternate phone" },
              { name: "address", label: "Address", fullWidth: true },
            ]}
            onAdd={addTo("emergency-contacts")}
            onDelete={removeFrom("emergency-contacts")}
          />
        </TabsContent>

        <TabsContent value="education">
          <CollectionSection
            title="Education"
            items={detail.education}
            columns={[
              { key: "degree", label: "Degree" },
              { key: "institution", label: "Institution" },
              { key: "fieldOfStudy", label: "Field" },
              { key: "endYear", label: "Completed" },
              { key: "grade", label: "Grade" },
            ]}
            fields={[
              { name: "degree", label: "Degree", placeholder: "BSc Civil Engineering" },
              { name: "institution", label: "Institution" },
              { name: "fieldOfStudy", label: "Field of study" },
              { name: "grade", label: "Grade / CGPA" },
              { name: "startYear", label: "Start year", placeholder: "2016" },
              { name: "endYear", label: "End year", placeholder: "2020" },
            ]}
            onAdd={addTo("education")}
            onDelete={removeFrom("education")}
          />
        </TabsContent>

        <TabsContent value="experience">
          <CollectionSection
            title="Work experience"
            description="Roles held before joining Ashcon Engineering."
            items={detail.experience}
            columns={[
              { key: "jobTitle", label: "Role" },
              { key: "company", label: "Company" },
              { key: "location", label: "Location" },
              { key: "startDate", label: "From" },
              { key: "endDate", label: "To", format: (value) => value || "Present" },
            ]}
            fields={[
              { name: "jobTitle", label: "Job title" },
              { name: "company", label: "Company" },
              { name: "location", label: "Location" },
              { name: "startDate", label: "Start date", type: "date" },
              { name: "endDate", label: "End date (blank = current)", type: "date" },
              { name: "description", label: "Description", fullWidth: true },
            ]}
            onAdd={addTo("experience")}
            onDelete={removeFrom("experience")}
          />
        </TabsContent>

        <TabsContent value="certifications">
          <CollectionSection
            title="Certifications"
            description="Expiry dates feed the reminder engine."
            items={detail.certifications}
            columns={[
              { key: "name", label: "Certification" },
              { key: "issuingBody", label: "Issued by" },
              { key: "credentialId", label: "Credential ID" },
              { key: "issuedOn", label: "Issued" },
              { key: "expiresOn", label: "Expires" },
            ]}
            fields={[
              { name: "name", label: "Certification" },
              { name: "issuingBody", label: "Issuing body" },
              { name: "credentialId", label: "Credential ID" },
              { name: "issuedOn", label: "Issued on", type: "date" },
              { name: "expiresOn", label: "Expires on", type: "date" },
            ]}
            onAdd={addTo("certifications")}
            onDelete={removeFrom("certifications")}
          />
        </TabsContent>

        <TabsContent value="skills">
          <CollectionSection
            title="Skills"
            items={detail.skills}
            columns={[
              { key: "name", label: "Skill" },
              { key: "level", label: "Level", format: (value) => humanize(value) },
              { key: "years", label: "Years" },
            ]}
            fields={[
              { name: "name", label: "Skill", placeholder: "AutoCAD, Steel detailing…" },
              {
                name: "level",
                label: "Level",
                type: "select",
                options: enumOptions(SKILL_LEVELS),
              },
              { name: "years", label: "Years of experience" },
            ]}
            onAdd={addTo("skills")}
            onDelete={removeFrom("skills")}
          />
        </TabsContent>

        <TabsContent value="medical">
          <MedicalForm employeeId={id} initial={detail.medical} onSaved={() => void load()} />
        </TabsContent>

        {detail.canViewSalary ? (
          <TabsContent value="salary">
            <SalaryForm employeeId={id} initial={detail.salary} onSaved={() => void load()} />
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
