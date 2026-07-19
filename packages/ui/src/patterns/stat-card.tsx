import * as React from "react";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "../primitives/card";
import { cn } from "../lib/cn";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Percentage change; positive renders green/up, negative red/down. */
  trend?: number;
  hint?: string;
  className?: string;
}

/** KPI tile for dashboards. */
export function StatCard({ label, value, icon: Icon, trend, hint, className }: StatCardProps) {
  const hasTrend = typeof trend === "number";
  const up = (trend ?? 0) >= 0;
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
          {hasTrend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                up ? "text-success" : "text-destructive",
              )}
            >
              {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(trend as number)}%
            </span>
          ) : null}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
