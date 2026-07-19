import type { ComponentType } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./core/auth/auth-context";
import { ProtectedRoute } from "./core/auth/ProtectedRoute";
import { AppShell } from "./core/layout/AppShell";
import { NAV_ITEMS } from "./core/navigation/nav";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ModulePlaceholder } from "./pages/ModulePlaceholder";
import { UsersPage } from "./pages/UsersPage";
import { UserCreatePage } from "./pages/UserCreatePage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EmployeeCreatePage } from "./pages/EmployeeCreatePage";
import { EmployeeDetailPage } from "./pages/EmployeeDetailPage";
import { FinancePage } from "./pages/FinancePage";
import { HrPage } from "./pages/HrPage";
import { JournalCreatePage } from "./pages/JournalCreatePage";

/** Modules that are built. Anything else falls back to the roadmap placeholder. */
const IMPLEMENTED_PAGES: Record<string, ComponentType> = {
  users: UsersPage,
  employee: EmployeesPage,
  finance: FinancePage,
  hr: HrPage,
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="users/new" element={<UserCreatePage />} />
              {/* Static "new" outranks the dynamic ":id" in React Router. */}
              <Route path="employee/new" element={<EmployeeCreatePage />} />
              <Route path="employee/:id" element={<EmployeeDetailPage />} />
              <Route path="finance/journal/new" element={<JournalCreatePage />} />
              {/* Routes are generated from the navigation registry — the same
                  source the sidebar uses, so the two can never drift.
                  Paths are relative: children of a pathless layout route must
                  not use a leading slash. */}
              {NAV_ITEMS.filter((item) => item.path !== "/").map((item) => {
                const Page = IMPLEMENTED_PAGES[item.key];
                return (
                  <Route
                    key={item.key}
                    path={item.path.replace(/^\//, "")}
                    element={Page ? <Page /> : <ModulePlaceholder moduleKey={item.key} />}
                  />
                );
              })}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
