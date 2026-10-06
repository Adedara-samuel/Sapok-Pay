"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Eye, EyeOff, Lock, Mail, CheckCircle2 } from "lucide-react";
import { Button, ErrorText, Input, Label } from "@/components/ui";
import { apiClient, SapokPayApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { PoweredBySapok } from "@/components/powered-by-sapok";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/wordmark";

const PERKS = ["A live wallet the moment you sign up — no approval queue", "Scoped API keys for server-to-server integration", "Signed webhooks for every transfer and payroll event"];

export default function MerchantSignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((state) => state.setTokens);
  const healthQuery = useQuery({ queryKey: ["sapok-pay-health"], queryFn: () => apiClient.health(), refetchInterval: 15_000 });

  const signupMutation = useMutation({
    mutationFn: () => apiClient.auth.merchantSignup(email.trim(), password, businessName.trim()),
    onSuccess: (tokens) => {
      setTokens(tokens);
      router.push("/wallet");
    },
    onError: (err) => {
      setError(err instanceof SapokPayApiError ? err.message : "Could not reach SAPOK Pay.");
    },
  });

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
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
              A merchant account, <span className="bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">live in seconds.</span>
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Public, self-service payments infrastructure — sign up and start moving money immediately.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {PERKS.map((perk, i) => (
              <div key={perk} style={{ animationDelay: `${150 + i * 80}ms` }} className="flex animate-fade-in-up items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <PoweredBySapok />
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center px-6 py-16">
        <ThemeToggle className="absolute right-6 top-6" />

        <div className="w-full max-w-sm animate-scale-in">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="mb-6 flex flex-col gap-1">
            <h2 className="font-display text-2xl font-bold text-foreground">Create your account</h2>
            <p className="text-sm text-muted-foreground">
              Already have one?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              signupMutation.mutate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="business-name">Business name</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="business-name" required className="pl-9" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" required autoComplete="email" className="pl-9" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password (min 8 characters)</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
            <Button type="submit" disabled={signupMutation.isPending} className="mt-2">
              {signupMutation.isPending ? "Creating account…" : "Create account"}
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
