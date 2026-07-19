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
import type { EmployeeListItem } from "@ca/contracts";
import { UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../core/api/client";
import { humanize } from "../components/EmployeeProfileFields";

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

export function EmployeesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<EmployeeListItem[]>("/employees")
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load employees.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = React.useMemo<ColumnDef<EmployeeListItem, unknown>[]>(
    () => [
      { accessorKey: "employeeCode", header: "Code", size: 105 },
      {
        accessorKey: "name",
        header: "Name",
        size: 165,
        cell: (info) => (
          <Link
            to={`/employee/${info.row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {info.getValue() as string}
          </Link>
        ),
      },
      { accessorKey: "department", header: "Department", size: 200 },
      { accessorKey: "designation", header: "Designation", size: 150 },
      { accessorKey: "reportsTo", header: "Reports to", size: 150 },
      {
        accessorKey: "employmentType",
        header: "Type",
        size: 120,
        cell: (info) => humanize(info.getValue() as string),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 115,
        cell: (info) => {
          const value = info.getValue() as string;
          return <Badge variant={statusVariant(value)}>{humanize(value)}</Badge>;
        },
      },
      {
        accessorKey: "dateOfJoining",
        header: "Joined",
        size: 120,
        cell: (info) => new Date(info.getValue() as string).toLocaleDateString(),
      },
      { accessorKey: "email", header: "Email", size: 220 },
      { accessorKey: "phone", header: "Phone", size: 150 },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Employees"
        description="The personnel record for everyone at Ashcon Engineering."
        actions={
          <Button onClick={() => navigate("/employee/new")}>
            <UserPlus />
            Add employee
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
        title="Ashcon Engineering — Employees"
        exportFilename="ashcon-employees"
        searchPlaceholder="Search name, code, department…"
        enableSelection
        bulkActions={(selected) => (
          <Button size="sm" variant="outline">
            Export {selected.length} selected
          </Button>
        )}
        emptyTitle="No employees yet"
        emptyDescription="Add the first employee record to get started."
      />
    </>
  );
}
