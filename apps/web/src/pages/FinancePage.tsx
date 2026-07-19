import * as React from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ColumnDef,
} from "@ca/ui";
import type { AccountListItem, JournalListItem, TrialBalance } from "@ca/contracts";
import { Plus } from "lucide-react";
import { apiFetch } from "../core/api/client";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const TYPE_VARIANT: Record<string, BadgeVariant> = {
  ASSET: "default",
  LIABILITY: "warning",
  EQUITY: "secondary",
  INCOME: "success",
  EXPENSE: "destructive",
};

function statusVariant(status: string): BadgeVariant {
  if (status === "POSTED") return "success";
  if (status === "REVERSED") return "destructive";
  return "secondary";
}

/** 1234567.89 -> "1,234,567.89" */
function money(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinancePage() {
  const [accounts, setAccounts] = React.useState<AccountListItem[]>([]);
  const [journal, setJournal] = React.useState<JournalListItem[]>([]);
  const [trial, setTrial] = React.useState<TrialBalance | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<AccountListItem[]>("/finance/accounts"),
      apiFetch<JournalListItem[]>("/finance/journal"),
      apiFetch<TrialBalance>("/finance/trial-balance"),
    ])
      .then(([accountData, journalData, trialData]) => {
        if (cancelled) return;
        setAccounts(accountData);
        setJournal(journalData);
        setTrial(trialData);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load finance data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accountColumns = React.useMemo<ColumnDef<AccountListItem, unknown>[]>(
    () => [
      { accessorKey: "code", header: "Code", size: 90 },
      {
        accessorKey: "name",
        header: "Account",
        size: 300,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span
              style={{ paddingLeft: `${row.depth * 14}px` }}
              className={row.isGroup ? "font-semibold" : ""}
            >
              {info.getValue() as string}
            </span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 110,
        cell: (info) => {
          const value = info.getValue() as string;
          return <Badge variant={TYPE_VARIANT[value] ?? "secondary"}>{value}</Badge>;
        },
      },
      {
        accessorKey: "subType",
        header: "Category",
        size: 180,
        cell: (info) => (info.getValue() as string).replace(/_/g, " ").toLowerCase(),
      },
      { accessorKey: "normalBalance", header: "Normal", size: 90 },
      {
        accessorKey: "isGroup",
        header: "Postable",
        size: 100,
        cell: (info) => ((info.getValue() as boolean) ? "Heading" : "Yes"),
      },
    ],
    [],
  );

  const journalColumns = React.useMemo<ColumnDef<JournalListItem, unknown>[]>(
    () => [
      { accessorKey: "entryNumber", header: "Entry #", size: 150 },
      { accessorKey: "entryDate", header: "Date", size: 110 },
      { accessorKey: "narration", header: "Narration", size: 320 },
      { accessorKey: "reference", header: "Reference", size: 120 },
      { accessorKey: "period", header: "Period", size: 110 },
      {
        accessorKey: "totalDebit",
        header: "Amount",
        size: 130,
        cell: (info) => <span className="tabular-nums">{money(info.getValue() as string)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        cell: (info) => {
          const value = info.getValue() as string;
          return <Badge variant={statusVariant(value)}>{value}</Badge>;
        },
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Finance"
        description="Double-entry ledger, chart of accounts and statutory reporting."
        actions={
          <Button asChild>
            <Link to="/finance/journal/new">
              <Plus />
              New journal entry
            </Link>
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="journal">
        <TabsList className="mb-3">
          <TabsTrigger value="journal">Journal ({journal.length})</TabsTrigger>
          <TabsTrigger value="accounts">Chart of accounts ({accounts.length})</TabsTrigger>
          <TabsTrigger value="trial">Trial balance</TabsTrigger>
        </TabsList>

        <TabsContent value="journal">
          <DataTable
            data={journal}
            columns={journalColumns}
            isLoading={isLoading}
            title="Ashcon Engineering — Journal"
            exportFilename="ashcon-journal"
            searchPlaceholder="Search narration, reference, entry…"
            emptyTitle="No journal entries"
            emptyDescription="Post the first entry to start the ledger."
          />
        </TabsContent>

        <TabsContent value="accounts">
          <DataTable
            data={accounts}
            columns={accountColumns}
            isLoading={isLoading}
            title="Ashcon Engineering — Chart of Accounts"
            exportFilename="ashcon-chart-of-accounts"
            searchPlaceholder="Search code or account name…"
            pageSize={25}
            emptyTitle="No accounts"
            emptyDescription="Seed the chart of accounts to begin."
          />
        </TabsContent>

        <TabsContent value="trial">
          <Card>
            <CardContent className="p-5">
              {trial ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Posted movement as of <span className="font-medium">{trial.asOf}</span>.
                      Drafts and future-dated entries are excluded.
                    </p>
                    <Badge variant={trial.balanced ? "success" : "destructive"}>
                      {trial.balanced ? "Balanced" : "Out of balance"}
                    </Badge>
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Code</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Account</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Debit</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trial.rows.map((row) => (
                          <tr key={row.accountId} className="border-t">
                            <td className="px-3 py-2 tabular-nums">{row.code}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.type}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.debit === "0.00" ? "—" : money(row.debit)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.credit === "0.00" ? "—" : money(row.credit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-muted/40 font-semibold">
                          <td className="px-3 py-2" colSpan={3}>
                            Total
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {money(trial.totalDebit)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {money(trial.totalCredit)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading trial balance…" : "No posted entries yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
