import * as React from "react";
import type { AuthRole, LoginResponse, MeResponse, PublicUser } from "@ca/contracts";
import { apiFetch, refreshSession, setAccessToken } from "../api/client";

export type { AuthRole };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  roles: AuthRole[];
  /** Primary role, for display. */
  roleLabel: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  permissions: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Permission check mirroring the server's RBAC (UI convenience only). */
  can: (permission: string) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function toAuthUser(user: PublicUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    roles: user.roles,
    roleLabel: user.roles[0]?.name ?? (user.isSuperAdmin ? "Super Admin" : "User"),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  // On boot, try a silent refresh (httpOnly cookie) to restore the session.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
        const me = await apiFetch<MeResponse>("/auth/me");
        if (cancelled) return;
        setUser(toAuthUser(me.user));
        setPermissions(me.permissions);
      } catch {
        setAccessToken(null);
        if (!cancelled) {
          setUser(null);
          setPermissions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const result = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(result.accessToken);
    setUser(toAuthUser(result.user));
    const me = await apiFetch<MeResponse>("/auth/me");
    setPermissions(me.permissions);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST", body: "{}" });
    } catch {
      // logging out is best-effort / idempotent
    }
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  const can = React.useCallback(
    (permission: string) => permissions.includes("*") || permissions.includes(permission),
    [permissions],
  );

  const value = React.useMemo(
    () => ({ user, permissions, loading, login, logout, can }),
    [user, permissions, loading, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
