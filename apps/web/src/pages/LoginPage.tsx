import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@ca/contracts";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  ThemeToggle,
} from "@ca/ui";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../core/auth/auth-context";

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPw, setShowPw] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  React.useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Login failed. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-secondary/50">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* subtle brand watermark */}
      <Building2 className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 text-primary/[0.03]" />

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-card">
              CA
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Connect Affairs</h1>
            <p className="text-sm text-muted-foreground">Ashcon Engineering · Employee Portal</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold">Sign in</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Use your Ashcon account to continue.
              </p>

              {serverError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
              {notice ? (
                <Alert className="mb-4">
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              ) : null}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="admin@ashcon.local"
                      className="pl-9"
                      {...register("email")}
                    />
                  </div>
                  {errors.email ? (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        setNotice("Password reset arrives with the next auth increment (2FA + recovery).")
                      }
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="············"
                      className="pl-9 pr-9"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                Secured by bcrypt &amp; rotating JWT sessions
              </div>

              {/* Dev-only convenience — never rendered in a production build. */}
              {import.meta.env.DEV ? (
                <div className="mt-3 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Seeded admin</span> ·
                  admin@ashcon.local · Ashcon@2026
                </div>
              ) : null}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ashcon Engineering · Powered by Connect Affairs
          </p>
        </div>
      </div>
    </div>
  );
}
