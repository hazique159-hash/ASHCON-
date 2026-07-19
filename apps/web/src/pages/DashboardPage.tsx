import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Separator,
  StatCard,
} from "@ca/ui";
import { Building2, FolderKanban, Megaphone, ShieldCheck, Users, Wallet } from "lucide-react";
import { useAuth } from "../core/auth/auth-context";

export function DashboardPage() {
  const { user, permissions } = useAuth();
  const firstName = user?.name.split(" ")[0] ?? "";
  const permissionLabel = permissions.includes("*")
    ? "All permissions"
    : `${permissions.length} permissions`;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening at Ashcon Engineering today."
        actions={<Badge variant="success">All systems operational</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees" value={20} icon={Users} trend={5} hint="vs last month" />
        <StatCard label="Departments" value={3} icon={Building2} />
        <StatCard
          label="Active Projects"
          value={12}
          icon={FolderKanban}
          trend={-2}
          hint="2 closing soon"
        />
        <StatCard label="Payroll (PKR)" value="4.8M" icon={Wallet} trend={3} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Company announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description="Company-wide announcements will appear here once the Communication module ships."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Name</span>
              <span className="truncate font-medium">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Role</span>
              <Badge>{user?.roleLabel}</Badge>
            </div>
            <Separator />
            <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">{permissionLabel}</span> — your sidebar
                only shows modules you are allowed to open.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
