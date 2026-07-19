import { Badge, Card, CardContent, PageHeader, Separator } from "@ca/ui";
import { findNavItemByKey } from "../core/navigation/nav";

/**
 * Shown for modules that are on the roadmap but not yet built. Replaced by the
 * real module UI as each phase ships.
 */
export function ModulePlaceholder({ moduleKey }: { moduleKey: string }) {
  const item = findNavItemByKey(moduleKey);
  if (!item) return null;
  const Icon = item.icon;

  return (
    <>
      <PageHeader
        title={item.label}
        description={item.description}
        actions={<Badge variant="warning">In development</Badge>}
      />
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-semibold">{item.label} module</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Scheduled in the build roadmap. When it ships it inherits this shell, the design
              system, RBAC, audit trail, approval workflow and exports — none of that is rebuilt
              per module.
            </p>

            {item.contains?.length ? (
              <>
                <Separator className="my-6" />
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Will include
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {item.contains.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
