import * as React from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  DataTable,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ColumnDef,
} from "@ca/ui";
import type { AttendanceItem, HolidayItem, LeaveRequestItem } from "@ca/contracts";
import { Check, X } from "lucide-react";
import { apiFetch } from "../core/api/client";
import { humanize } from "../components/EmployeeProfileFields";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

function leaveVariant(status: string): BadgeVariant {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED" || status === "CANCELLED") return "destructive";
  if (status === "PENDING") return "warning";
  return "secondary";
}

function attendanceVariant(status: string): BadgeVariant {
  switch (status) {
    case "PRESENT":
    case "REMOTE":
      return "success";
    case "ABSENT":
      return "destructive";
    case "LATE":
    case "HALF_DAY":
      return "warning";
    default:
      return "secondary";
  }
}

export function HrPage() {
  const [leave, setLeave] = React.useState<LeaveRequestItem[]>([]);
  const [attendance, setAttendance] = React.useState<AttendanceItem[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [leaveData, attendanceData, holidayData] = await Promise.all([
      apiFetch<LeaveRequestItem[]>("/hr/leave"),
      apiFetch<AttendanceItem[]>("/hr/attendance"),
      apiFetch<HolidayItem[]>("/hr/holidays"),
    ]);
    setLeave(leaveData);
    setAttendance(attendanceData);
    setHolidays(holidayData);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    load()
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load HR data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    setBusyId(id);
    try {
      await apiFetch(`/hr/leave/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record that decision.");
    } finally {
      setBusyId(null);
    }
  };

  const leaveColumns = React.useMemo<ColumnDef<LeaveRequestItem, unknown>[]>(
    () => [
      { accessorKey: "requestNumber", header: "Request #", size: 140 },
      { accessorKey: "employeeName", header: "Employee", size: 160 },
      { accessorKey: "leaveType", header: "Type", size: 140 },
      { accessorKey: "startDate", header: "From", size: 110 },
      { accessorKey: "endDate", header: "To", size: 110 },
      {
        accessorKey: "days",
        header: "Days",
        size: 80,
        cell: (info) => <span className="tabular-nums">{info.getValue() as string}</span>,
      },
      { accessorKey: "reason", header: "Reason", size: 220 },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        cell: (info) => {
          const value = info.getValue() as string;
          return <Badge variant={leaveVariant(value)}>{humanize(value)}</Badge>;
        },
      },
      {
        id: "actions",
        header: "Decision",
        size: 150,
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          if (row.status !== "PENDING") return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => void decide(row.id, "APPROVED")}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => void decide(row.id, "REJECTED")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [busyId],
  );

  const attendanceColumns = React.useMemo<ColumnDef<AttendanceItem, unknown>[]>(
    () => [
      { accessorKey: "date", header: "Date", size: 110 },
      { accessorKey: "employeeCode", header: "Code", size: 100 },
      { accessorKey: "employeeName", header: "Employee", size: 170 },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        cell: (info) => {
          const value = info.getValue() as string;
          return <Badge variant={attendanceVariant(value)}>{humanize(value)}</Badge>;
        },
      },
      { accessorKey: "checkIn", header: "In", size: 80 },
      { accessorKey: "checkOut", header: "Out", size: 80 },
      { accessorKey: "workedHours", header: "Hours", size: 90 },
      { accessorKey: "notes", header: "Notes", size: 200 },
    ],
    [],
  );

  const holidayColumns = React.useMemo<ColumnDef<HolidayItem, unknown>[]>(
    () => [
      { accessorKey: "date", header: "Date", size: 120 },
      { accessorKey: "name", header: "Holiday", size: 240 },
      {
        accessorKey: "isRecurring",
        header: "Recurring",
        size: 110,
        cell: (info) => ((info.getValue() as boolean) ? "Yes" : "No"),
      },
      { accessorKey: "description", header: "Notes", size: 280 },
    ],
    [],
  );

  const pending = leave.filter((request) => request.status === "PENDING").length;

  return (
    <>
      <PageHeader
        title="HR Operations"
        description="Leave, attendance and the holiday calendar."
        actions={
          pending > 0 ? <Badge variant="warning">{pending} awaiting approval</Badge> : null
        }
      />

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="leave">
        <TabsList className="mb-3">
          <TabsTrigger value="leave">Leave ({leave.length})</TabsTrigger>
          <TabsTrigger value="attendance">Attendance ({attendance.length})</TabsTrigger>
          <TabsTrigger value="holidays">Holidays ({holidays.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          <DataTable
            data={leave}
            columns={leaveColumns}
            isLoading={isLoading}
            title="Ashcon Engineering — Leave requests"
            exportFilename="ashcon-leave-requests"
            searchPlaceholder="Search employee, type, reason…"
            emptyTitle="No leave requests"
            emptyDescription="Leave requests will appear here once submitted."
          />
        </TabsContent>

        <TabsContent value="attendance">
          <DataTable
            data={attendance}
            columns={attendanceColumns}
            isLoading={isLoading}
            title="Ashcon Engineering — Attendance"
            exportFilename="ashcon-attendance"
            searchPlaceholder="Search employee or date…"
            emptyTitle="No attendance recorded"
            emptyDescription="Daily attendance will appear here once marked."
          />
        </TabsContent>

        <TabsContent value="holidays">
          <DataTable
            data={holidays}
            columns={holidayColumns}
            isLoading={isLoading}
            title="Ashcon Engineering — Holiday calendar"
            exportFilename="ashcon-holidays"
            searchPlaceholder="Search holidays…"
            emptyTitle="No holidays configured"
            emptyDescription="Add public holidays so leave day-counts stay accurate."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
