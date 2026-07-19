import * as React from "react";
import { cn } from "../lib/cn";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, export menu, etc.). */
  actions?: React.ReactNode;
  /** Optional breadcrumb node rendered above the title. */
  breadcrumb?: React.ReactNode;
}

/** Standard page header used at the top of every page for a consistent layout. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)} {...props}>
      {breadcrumb}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
