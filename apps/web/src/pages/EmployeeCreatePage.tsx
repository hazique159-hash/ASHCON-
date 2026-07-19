import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
  type CreatedEmployee,
  type EmployeeReference,
} from "@ca/contracts";
import { useNavigate } from "react-router-dom";
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
} from "@ca/ui";
import { apiFetch } from "../core/api/client";
import { EmployeeProfileFields } from "../components/EmployeeProfileFields";

const DRAFT_KEY = "ca-draft-employee-create";

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [reference, setReference] = React.useState<EmployeeReference>({
    departments: [],
    designations: [],
    branches: [],
    managers: [],
  });
  const [created, setCreated] = React.useState<CreatedEmployee | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employeeCode: "",
      firstName: "",
      lastName: "",
      fatherName: "",
      dateOfBirth: "",
      nationality: "",
      nationalId: "",
      personalEmail: "",
      personalPhone: "",
      city: "",
      country: "Pakistan",
      departmentId: "",
      designationId: "",
      branchId: "",
      reportsToId: "",
      employmentType: "FULL_TIME",
      status: "ACTIVE",
      dateOfJoining: "",
    },
  });

  const {
    handleSubmit,
    reset,
    getValues,
    formState: { isDirty, isSubmitting },
  } = form;

  React.useEffect(() => {
    void apiFetch<EmployeeReference>("/employees/reference")
      .then(setReference)
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      reset(JSON.parse(raw) as CreateEmployeeInput, { keepDefaultValues: true });
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [reset]);

  const saveDraft = React.useCallback(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
  }, [getValues]);

  const onSubmit = async (values: CreateEmployeeInput) => {
    setError(null);
    try {
      const result = await apiFetch<CreatedEmployee>("/employees", {
        method: "POST",
        body: JSON.stringify(values),
      });
      localStorage.removeItem(DRAFT_KEY);
      setCreated(result);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the employee.");
    }
  };

  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <AlertDescription>
              <strong>{created.name}</strong> ({created.employeeCode}) has been added to the
              personnel record.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/employee/${created.id}`)}>Open profile</Button>
            <Button variant="outline" onClick={() => navigate("/employee")}>
              Back to employees
            </Button>
            <Button variant="ghost" onClick={() => setCreated(null)}>
              Add another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FormShell
      title="Add employee"
      description="Create the personnel record. A portal account can be linked separately."
      status={<Badge variant="secondary">New</Badge>}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate("/employee")}
      onReset={() => reset()}
      onSaveDraft={saveDraft}
      autoSave
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      submitLabel="Create employee"
      error={error}
    >
      <EmployeeProfileFields form={form} reference={reference} />
    </FormShell>
  );
}
