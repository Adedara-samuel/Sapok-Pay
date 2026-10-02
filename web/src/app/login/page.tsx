"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Button, ErrorText, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { PoweredBySapok } from "@/components/powered-by-sapok";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/wordmark";

const FEATURES = [
  { icon: Wallet, label: "Wallets & bank connections" },
  { icon: Zap, label: "Instant transfers" },
  { icon: ShieldCheck, label: "Signed, verifiable webhooks" },
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const healthQuery = useQuery({ queryKey: ["sapok-pay-health"], queryFn: () => apiClient.health(), refetchInterval: 15_000 });

  const loginMutation = useMutation({
    mutationFn: () => apiClient.auth.login(email.trim(), password),
    onSuccess: (tokens) => {
      setTokens(tokens);
      router.push(useAuthStore.getState().scope === "admin" ? "/admin" : "/wallet");
    },
    onError: (err) => {
      const message = err instanceof SapokPayApiError ? err.message : "Could not reach SAPOK Pay.";
      setError(message);
      toast({ variant: "error", title: "Sign-in failed", description: message });
    },
  });

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Hero panel — hidden below lg */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border px-14 py-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,hsl(var(--primary)/0.2),transparent_55%)]" />
        <div className="pointer-events-none absolute -inset-1/4 animate-float bg-[radial-gradient(circle_at_80%_75%,hsl(var(--accent)/0.12),transparent_45%)]" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex items-center justify-between">
          <Logo />
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${!healthQuery.isError ? "animate-pulse-glow bg-success" : "bg-danger"}`} />
            {!healthQuery.isError ? "All systems normal" : "Degraded"}
          </span>
        </div>

        <div className="relative flex flex-col gap-8 animate-fade-in-up">
          <div className="flex flex-col gap-3">
            <h1 className="max-w-md font-display text-3xl font-extrabold leading-tight text-foreground">
              Welcome back to <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">SAPOK Pay.</span>
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Sign in to manage your wallet, move money and keep your payroll running — all from one dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {FEATURES.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                style={{ animationDelay: `${150 + i * 80}ms` }}
                className="flex animate-fade-in-up items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <PoweredBySapok />
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center px-6 py-16">
        <ThemeToggle className="absolute right-6 top-6" />

        <div className="w-full max-w-sm animate-scale-in">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="mb-6 flex flex-col gap-1">
            <h2 className="font-display text-2xl font-bold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-2 hover:underline">
                Create one
              </Link>
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              loginMutation.mutate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required autoComplete="email" className="pl-9" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" disabled={loginMutation.isPending} className="mt-2">
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 flex justify-center lg:hidden">
            <PoweredBySapok />
          </div>
        </div>
      </div>
    </main>
  );
}
