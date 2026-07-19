import {
  BarChart3,
  Calculator,
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permission required to see this entry; undefined = always visible. */
  permission?: string;
  description: string;
  /** Headline capabilities, surfaced on the module placeholder page. */
  contains?: string[];
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/**
 * Navigation is data, not markup. Today this is a static registry; once business
 * modules ship, each module manifest contributes its own entry here and the
 * sidebar is generated the same way — filtered by the user's permissions.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
        description: "Role-based overview of your day at Ashcon Engineering.",
      },
    ],
  },
  {
    key: "people",
    label: "People",
    items: [
      {
        key: "employee",
        label: "Employee",
        path: "/employee",
        icon: Users,
        permission: "employee:view",
        description: "Employee profiles and the complete personnel record.",
        contains: ["Profiles", "Documents", "Education & experience", "Medical", "Transfers", "Exit process"],
      },
      {
        key: "hr",
        label: "HR Operations",
        path: "/hr",
        icon: UserCog,
        permission: "hr:view",
        description: "Attendance, leave, recruitment, performance and letters.",
        contains: ["Attendance", "Leave", "Holidays", "Recruitment", "Performance", "Training", "Letters"],
      },
      {
        key: "payroll",
        label: "Payroll",
        path: "/payroll",
        icon: Wallet,
        permission: "payroll:view",
        description: "Salary structures, payslips and payroll approval.",
        contains: ["Salary structure", "Allowances", "Deductions", "Overtime", "Loans", "Payslips", "Bank transfers"],
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    items: [
      {
        key: "finance",
        label: "Finance",
        path: "/finance",
        icon: Receipt,
        permission: "finance:view",
        description: "Accounting, billing, budgets and financial statements.",
        contains: ["Chart of accounts", "Cash book", "Invoices", "Expenses", "Budget", "P&L", "Balance sheet", "GST/VAT"],
      },
    ],
  },
  {
    key: "supply",
    label: "Supply Chain",
    items: [
      {
        key: "procurement",
        label: "Procurement",
        path: "/procurement",
        icon: ShoppingCart,
        permission: "procurement:view",
        description: "Purchase requests, vendors, orders and supplier payments.",
        contains: ["Purchase requests", "Vendors", "Purchase orders", "GRN", "Supplier payments", "Vendor performance"],
      },
      {
        key: "inventory",
        label: "Inventory",
        path: "/inventory",
        icon: Package,
        permission: "inventory:view",
        description: "Warehouses, stock levels, movement and material requests.",
        contains: ["Warehouses", "Stock levels", "Movement", "Material requests", "Issue/return notes", "Min-stock alerts"],
      },
      {
        key: "vehicle",
        label: "Vehicle & Fleet",
        path: "/vehicle",
        icon: Truck,
        permission: "vehicle:view",
        description: "Vehicle register, drivers, fuel and maintenance.",
        contains: ["Vehicle register", "Driver assignment", "Fuel consumption", "Maintenance", "Documents"],
      },
    ],
  },
  {
    key: "delivery",
    label: "Project Delivery",
    items: [
      {
        key: "projects",
        label: "Projects",
        path: "/projects",
        icon: FolderKanban,
        permission: "projects:view",
        description: "Project execution, milestones, site reports and costs.",
        contains: ["Milestones", "Tasks & Gantt", "Daily site reports", "Site photos", "RFI", "Variation orders", "Sub-contractors"],
      },
      {
        key: "boq",
        label: "BOQ",
        path: "/boq",
        icon: Calculator,
        permission: "boq:view",
        description: "Bills of quantities, rate analysis and revisions.",
        contains: ["Estimate creation", "Rate analysis", "Import/export", "Variation comparison", "Revision history"],
      },
    ],
  },
  {
    key: "workplace",
    label: "Workplace",
    items: [
      {
        key: "documents",
        label: "Documents",
        path: "/documents",
        icon: FileText,
        permission: "documents:view",
        description: "Company document library with versioning and watermarks.",
        contains: ["Folders", "Version control", "Watermarking", "Download logs", "Expiry alerts", "Digital signatures"],
      },
      {
        key: "helpdesk",
        label: "Helpdesk",
        path: "/helpdesk",
        icon: LifeBuoy,
        permission: "helpdesk:view",
        description: "Internal requests, reimbursements and complaints.",
        contains: ["Leave requests", "HR/Finance requests", "Reimbursements", "Anonymous complaints"],
      },
      {
        key: "comms",
        label: "Communication",
        path: "/comms",
        icon: MessageSquare,
        permission: "comms:view",
        description: "Company chat, announcements and department channels.",
        contains: ["Announcements", "Direct messages", "Department channels", "Mentions", "Read receipts"],
      },
      {
        key: "calendar",
        label: "Calendar",
        path: "/calendar",
        icon: CalendarDays,
        permission: "calendar:view",
        description: "Meetings, deadlines, milestones and company events.",
        contains: ["Meetings", "Leave calendar", "Deadlines", "Project milestones", "Company events"],
      },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    items: [
      {
        key: "reports",
        label: "Reports",
        path: "/reports",
        icon: BarChart3,
        permission: "reports:view",
        description: "Cross-module reporting with charts and exports.",
        contains: ["Attendance", "Payroll", "Finance", "Inventory", "Projects", "PDF & Excel export"],
      },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    items: [
      {
        key: "users",
        label: "Users & Roles",
        path: "/users",
        icon: ShieldCheck,
        permission: "users:view",
        description: "Portal accounts, role assignments and access status.",
        contains: ["Accounts", "Roles", "Permission matrix", "Lock/unlock", "Login history"],
      },
      {
        key: "settings",
        label: "Settings",
        path: "/settings",
        icon: Settings,
        permission: "settings:view",
        description: "Company setup, users, roles, permissions and preferences.",
        contains: ["Company", "Departments", "Designations", "Users & roles", "Permission matrix", "Email", "Backups"],
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function findNavItemByKey(key: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.key === key);
}
