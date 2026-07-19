import { NavLink } from "react-router-dom";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@ca/ui";
import { NAV_GROUPS, type NavItem } from "../navigation/nav";
import { useAuth } from "../auth/auth-context";

interface SidebarNavProps {
  collapsed: boolean;
  /** Called after navigating — used to close the mobile drawer. */
  onNavigate?: () => void;
}

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem } & SidebarNavProps) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
          "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
          isActive && "bg-white/10 text-sidebar-foreground",
          collapsed && "justify-center px-0",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/** Sidebar contents, shared by the desktop rail and the mobile drawer. */
export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const { can } = useAuth();

  // Role-based navigation: entries the user cannot access are never rendered.
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-bold text-sidebar">
          CA
        </div>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Connect Affairs</p>
            <p className="truncate text-[11px] leading-tight text-sidebar-foreground/55">
              Ashcon Engineering
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.key} className="mb-4 last:mb-0">
            {collapsed ? null : (
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.key}>
                  <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {collapsed ? null : (
        <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
          <p className="text-[11px] text-sidebar-foreground/45">Powered by Connect Affairs</p>
        </div>
      )}
    </div>
  );
}
