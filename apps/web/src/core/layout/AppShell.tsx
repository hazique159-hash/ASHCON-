import * as React from "react";
import { Outlet } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, TooltipProvider, cn } from "@ca/ui";
import { SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";

const COLLAPSE_KEY = "ca-sidebar-collapsed";

/**
 * The single application layout. Every authenticated page renders through this
 * shell, which is what makes the header, sidebar, breadcrumbs and spacing
 * identical across all modules by construction.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = React.useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-secondary/40">
        {/* Desktop rail */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block",
            collapsed ? "w-16" : "w-64",
          )}
        >
          <SidebarNav collapsed={collapsed} />
        </aside>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div
          className={cn(
            "flex min-h-screen flex-col transition-[padding] duration-200",
            collapsed ? "lg:pl-16" : "lg:pl-64",
          )}
        >
          <Topbar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
            onOpenMobileNav={() => setMobileOpen(true)}
          />

          <main className="relative flex-1 overflow-hidden">
            {/* Company mark as a subtle centred watermark, not in the header. */}
            <Building2
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-20 h-[460px] w-[460px] -translate-x-1/2 text-primary/[0.025]"
            />
            <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
              <Breadcrumbs />
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
