import * as React from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
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
import { Loader2, Plus, Trash2 } from "lucide-react";

export interface CollectionField {
  name: string;
  label: string;
  type?: "text" | "date" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  fullWidth?: boolean;
}

export interface CollectionColumn {
  key: string;
  label: string;
  format?: (value: string) => string;
}

interface CollectionSectionProps<TItem extends { id: string }> {
  title: string;
  description?: string;
  fields: CollectionField[];
  columns: CollectionColumn[];
  items: TItem[];
  onAdd: (values: Record<string, string>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage?: string;
  canEdit?: boolean;
}

/**
 * List + inline "add" + delete for a child collection of a record.
 *
 * One implementation drives emergency contacts, education, experience,
 * certifications and skills — matching the generic API endpoint behind them.
 */
export function CollectionSection<TItem extends { id: string }>({
  title,
  description,
  fields,
  columns,
  items,
  onAdd,
  onDelete,
  emptyMessage = "Nothing recorded yet.",
  canEdit = true,
}: CollectionSectionProps<TItem>) {
  const emptyForm = React.useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, ""])) as Record<string, string>,
    [fields],
  );

  const [values, setValues] = React.useState<Record<string, string>>(emptyForm);
  const [isAdding, setIsAdding] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsAdding(true);
    try {
      await onAdd(values);
      setValues(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that entry.");
    } finally {
      setIsAdding(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that entry.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {column.label}
                    </th>
                  ))}
                  {canEdit ? <th className="w-12 px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    {columns.map((column) => {
                      // Column keys are looked up dynamically; the generic keeps
                      // the call site type-safe while this stays flexible.
                      const raw =
                        (item as unknown as Record<string, string | undefined>)[column.key] ?? "";
                      return (
                        <td key={column.key} className="px-3 py-2">
                          {column.format ? column.format(raw) : raw || "—"}
                        </td>
                      );
                    })}
                    {canEdit ? (
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove entry"
                          disabled={busyId === item.id}
                          onClick={() => void remove(item.id)}
                        >
                          {busyId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEdit ? (
          <form onSubmit={submit} className="space-y-4 rounded-md border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add entry
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={`space-y-1.5 ${field.fullWidth ? "sm:col-span-2" : ""}`}
                >
                  <Label htmlFor={`${title}-${field.name}`} className="text-xs">
                    {field.label}
                  </Label>
                  {field.type === "select" ? (
                    <Select
                      value={values[field.name] ?? ""}
                      onValueChange={(value) =>
                        setValues((current) => ({ ...current, [field.name]: value }))
                      }
                    >
                      <SelectTrigger id={`${title}-${field.name}`}>
                        <SelectValue placeholder={field.placeholder ?? "Select…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`${title}-${field.name}`}
                      type={field.type === "date" ? "date" : "text"}
                      placeholder={field.placeholder}
                      value={values[field.name] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <Button type="submit" size="sm" disabled={isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus />}
              Add
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
