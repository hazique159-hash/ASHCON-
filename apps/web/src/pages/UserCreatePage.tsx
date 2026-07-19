import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  type CreateUserInput,
  type CreatedUser,
  type UserListItem,
  type UserReference,
} from "@ca/contracts";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormShell,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ForwardPayload,
} from "@ca/ui";
import { apiFetch } from "../core/api/client";

const DRAFT_KEY = "ca-draft-user-create";

export function UserCreatePage() {
  const navigate = useNavigate();
  const [reference, setReference] = React.useState<UserReference>({ departments: [], roles: [] });
  const [colleagues, setColleagues] = React.useState<UserListItem[]>([]);
  const [created, setCreated] = React.useState<CreatedUser | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeCode: "",
      phone: "",
      departmentId: "",
      roleId: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  // Reference data + colleagues for the forwarding control.
  React.useEffect(() => {
    void apiFetch<UserReference>("/users/reference").then(setReference).catch(() => undefined);
    void apiFetch<UserListItem[]>("/users")
      .then((list) => setColleagues(list))
      .catch(() => undefined);
  }, []);

  // Restore an in-progress draft.
  React.useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      reset(JSON.parse(raw) as CreateUserInput, { keepDefaultValues: true });
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [reset]);

  const saveDraft = React.useCallback(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
  }, [getValues]);

  const onSubmit = async (values: CreateUserInput) => {
    setError(null);
    try {
      const result = await apiFetch<CreatedUser>("/users", {
        method: "POST",
        body: JSON.stringify(values),
      });
      localStorage.removeItem(DRAFT_KEY);
      setCreated(result);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the user.");
    }
  };

  const handleForward = async (payload: ForwardPayload) => {
    // Forwarding persists once the core forwarding endpoint ships; the control
    // and its payload are final.
    console.warn("forward requested", payload);
  };

  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <AlertDescription>
              <strong>{created.name}</strong> ({created.email}) now has a portal account.
            </AlertDescription>
          </Alert>
          <div className="rounded-md border border-dashed bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Temporary password — shown once
            </p>
            <p className="mt-1 font-mono text-lg font-semibold">{created.temporaryPassword}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Share this securely. The account must change it at first sign-in.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/users")}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to users
            </button>
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Add another
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FormShell
      title="Add user"
      description="Create a portal account and assign its role."
      status={<Badge variant="secondary">New</Badge>}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate("/users")}
      onReset={() => reset()}
      onSaveDraft={saveDraft}
      autoSave
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      submitLabel="Create user"
      error={error}
      forward={{
        users: colleagues.map((user) => ({ id: user.id, name: user.name, roleLabel: user.roles })),
        onForward: handleForward,
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="name@ashcon.local" {...register("email")} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+92 300 0000000" {...register("phone")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment & access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="employeeCode">Employee code</Label>
            <Input id="employeeCode" placeholder="ASH-0021" {...register("employeeCode")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departmentId">Department</Label>
            <Select
              value={watch("departmentId") || ""}
              onValueChange={(value) => setValue("departmentId", value, { shouldDirty: true })}
            >
              <SelectTrigger id="departmentId">
                <SelectValue placeholder="Select a department…" />
              </SelectTrigger>
              <SelectContent>
                {reference.departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="roleId">Role</Label>
            <Select
              value={watch("roleId") || ""}
              onValueChange={(value) => setValue("roleId", value, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger id="roleId">
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent>
                {reference.roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId ? <p className="text-xs text-destructive">{errors.roleId.message}</p> : null}
            <p className="text-xs text-muted-foreground">
              The role determines which modules appear in this user&apos;s sidebar.
            </p>
          </div>
        </CardContent>
      </Card>
    </FormShell>
  );
}
