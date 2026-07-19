import * as React from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  createJournalSchema,
  type CreateJournalInput,
  type FinanceReference,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ca/ui";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../core/api/client";

const DRAFT_KEY = "ca-draft-journal";

function money(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyLine = { accountId: "", description: "", debit: "", credit: "", projectId: "" };

export function JournalCreatePage() {
  const navigate = useNavigate();
  const [reference, setReference] = React.useState<FinanceReference>({ accounts: [], periods: [] });
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<{ entryNumber: string; status: string } | null>(null);

  const form = useForm<CreateJournalInput>({
    resolver: zodResolver(createJournalSchema),
    defaultValues: {
      entryDate: new Date().toISOString().slice(0, 10),
      reference: "",
      narration: "",
      projectId: "",
      postImmediately: true,
      lines: [{ ...emptyLine }, { ...emptyLine }],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  React.useEffect(() => {
    void apiFetch<FinanceReference>("/finance/reference")
      .then(setReference)
      .catch(() => undefined);
  }, []);

  // useWatch (not watch) — field-array values only re-render reliably through
  // a control subscription, which is what keeps the running total live.
  const lines = useWatch({ control, name: "lines" });
  const postImmediately = useWatch({ control, name: "postImmediately" });

  const totals = React.useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const line of lines ?? []) {
      debit += Number(line.debit || 0) || 0;
      credit += Number(line.credit || 0) || 0;
    }
    // Compare in cents so floating point can't produce a false imbalance.
    const balanced = Math.round(debit * 100) === Math.round(credit * 100);
    return { debit, credit, balanced, difference: debit - credit };
  }, [lines]);

  const onSubmit = async (values: CreateJournalInput) => {
    setError(null);
    try {
      const result = await apiFetch<{ entryNumber: string; status: string }>("/finance/journal", {
        method: "POST",
        body: JSON.stringify(values),
      });
      localStorage.removeItem(DRAFT_KEY);
      setCreated(result);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the journal entry.");
    }
  };

  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Journal entry saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <AlertDescription>
              <strong>{created.entryNumber}</strong> was created with status{" "}
              <strong>{created.status}</strong>.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/finance")}>Back to finance</Button>
            <Button variant="outline" onClick={() => setCreated(null)}>
              Add another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lineErrors = errors.lines;

  return (
    <FormShell
      title="New journal entry"
      description="Debits must equal credits before the entry can be saved."
      status={
        <Badge variant={totals.balanced && totals.debit > 0 ? "success" : "warning"}>
          {totals.balanced && totals.debit > 0
            ? "Balanced"
            : `Out by ${money(Math.abs(totals.difference))}`}
        </Badge>
      }
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => navigate("/finance")}
      onReset={() => reset()}
      onSaveDraft={() => localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()))}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      submitLabel={postImmediately ? "Post entry" : "Save draft"}
      error={error}
    >
      <Card>
        <CardHeader>
          <CardTitle>Entry details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="entryDate">Entry date</Label>
            <Input id="entryDate" type="date" {...register("entryDate")} />
            {errors.entryDate ? (
              <p className="text-xs text-destructive">{errors.entryDate.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" placeholder="BILL-0442, RCPT-0031…" {...register("reference")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="narration">Narration</Label>
            <Input
              id="narration"
              placeholder="What does this entry record?"
              {...register("narration")}
            />
            {errors.narration ? (
              <p className="text-xs text-destructive">{errors.narration.message}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={postImmediately ?? false}
                onChange={(event) =>
                  setValue("postImmediately", event.target.checked, { shouldDirty: true })
                }
              />
              Post immediately to the ledger (otherwise saved as a draft)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {typeof lineErrors?.message === "string" ? (
            <Alert variant="destructive">
              <AlertDescription>{lineErrors.message}</AlertDescription>
            </Alert>
          ) : null}
          {typeof lineErrors?.root?.message === "string" ? (
            <Alert variant="destructive">
              <AlertDescription>{lineErrors.root.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <div className="space-y-1">
                  <Label className="text-xs sm:sr-only">Account</Label>
                  <Select
                    value={watch(`lines.${index}.accountId`) || ""}
                    onValueChange={(value) =>
                      setValue(`lines.${index}.accountId`, value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {reference.accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} — {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {lineErrors?.[index]?.accountId ? (
                    <p className="text-xs text-destructive">
                      {lineErrors[index]?.accountId?.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs sm:sr-only">Description</Label>
                  <Input placeholder="Line description" {...register(`lines.${index}.description`)} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs sm:sr-only">Debit</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Debit"
                    className="text-right tabular-nums"
                    {...register(`lines.${index}.debit`)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs sm:sr-only">Credit</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Credit"
                    className="text-right tabular-nums"
                    {...register(`lines.${index}.credit`)}
                  />
                  {lineErrors?.[index]?.debit ? (
                    <p className="text-xs text-destructive">{lineErrors[index]?.debit?.message}</p>
                  ) : null}
                </div>

                <div className="flex items-start pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={fields.length <= 2}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine })}>
            <Plus />
            Add line
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-6 rounded-md border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Debits <span className="ml-1 font-semibold tabular-nums text-foreground">{money(totals.debit)}</span>
            </span>
            <span className="text-muted-foreground">
              Credits <span className="ml-1 font-semibold tabular-nums text-foreground">{money(totals.credit)}</span>
            </span>
            <Badge variant={totals.balanced && totals.debit > 0 ? "success" : "destructive"}>
              {totals.debit === 0
                ? "No amounts entered"
                : totals.balanced
                  ? "Balanced"
                  : `Difference ${money(totals.difference)}`}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </FormShell>
  );
}
