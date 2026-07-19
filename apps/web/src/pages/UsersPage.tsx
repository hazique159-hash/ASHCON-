import * as React from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  DataTable,
  PageHeader,
  type ColumnDef,
} from "@ca/ui";
import type { UserListItem } from "@ca/contracts";
import { Lock, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../core/api/client";

type UserRow = UserListItem;

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "LOCKED":
    case "DISABLED":
      return "destructive";
    case "SUSPENDED":
      return "warning";
    default:
      return "secondary";
  }
}

export function UsersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<UserRow[]>("/users")
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = React.useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      { accessorKey: "employeeCode", header: "Code", size: 100 },
      {
        accessorKey: "name",
        header: "Name",
        size: 170,
        cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
      },
      { accessorKey: "email", header: "Email", size: 230 },
      { accessorKey: "department", header: "Department", size: 210 },
      { accessorKey: "roles", header: "Roles", size: 190 },
      { accessorKey: "phone", header: "Phone", size: 150 },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        cell: (info) => {
          const value = info.getValue() as string;
          return <Badge variant={statusVariant(value)}>{value}</Badge>;
        },
      },
      {
        accessorKey: "lastLoginAt",
        header: "Last login",
        size: 130,
        cell: (info) => {
          const value = info.getValue() as string | null;
          return value ? new Date(value).toLocaleDateString() : "—";
        },
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Portal accounts, role assignments and access status."
        actions={
          <Button onClick={() => navigate("/users/new")}>
            <UserPlus />
            Add user
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        title="Ashcon Engineering — Portal Users"
        exportFilename="ashcon-users"
        searchPlaceholder="Search name, email, role…"
        enableSelection
        bulkActions={(selected) => (
          <Button size="sm" variant="outline">
            <Lock />
            Lock {selected.length} account{selected.length === 1 ? "" : "s"}
          </Button>
        )}
        emptyTitle="No users found"
        emptyDescription="No portal accounts match your search or filters."
      />
    </>
  );
}
