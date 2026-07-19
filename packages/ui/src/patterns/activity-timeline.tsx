import * as React from "react";
import { cn } from "../lib/cn";

export interface TimelineEntry {
  id: string;
  /** Who performed the action. */
  actor: string;
  /** What happened, e.g. "Approved", "Created", "Status changed". */
  action: string;
  at: string | Date;
  detail?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function formatWhen(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const DOT: Record<NonNullable<TimelineEntry["variant"]>, string> = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

/** Vertical audit trail — used for activity history and approval history. */
export function ActivityTimeline({
  entries,
  emptyMessage = "No activity recorded yet.",
  className,
}: {
  entries: TimelineEntry[];
  emptyMessage?: string;
  className?: string;
}) {
  if (entries.length === 0) {
    return <p className={cn("py-6 text-center text-xs text-muted-foreground", className)}>{emptyMessage}</p>;
  }

  return (
    <ol className={cn("relative space-y-4 border-l pl-4", className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className={cn(
              "absolute -left-[21px] top-1 h-2 w-2 rounded-full ring-2 ring-background",
              DOT[entry.variant ?? "default"],
            )}
          />
          <p className="text-xs font-medium text-foreground">
            {entry.action} <span className="font-normal text-muted-foreground">by {entry.actor}</span>
          </p>
          {entry.detail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>
          ) : null}
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">{formatWhen(entry.at)}</p>
        </li>
      ))}
    </ol>
  );
}
