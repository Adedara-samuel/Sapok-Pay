"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Banknote, CheckCircle2, Clock, UserPlus, Wallet, Zap } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { TransactionChart } from "@/components/admin-transaction-chart";
import { apiClient } from "@/lib/api-client";
import { Logo } from "@/components/wordmark";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">No prior period to compare</span>;
  const up = pct >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-success" : "text-danger"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

const QUICK_ACTIONS = [
  { href: "/admin/organizations", icon: Wallet, title: "Fund wallet", body: "Add money to an organization's wallet" },
  { href: "/admin/organizations", icon: Zap, title: "Make payout", body: "Send to a bank account" },
  { href: "/admin/users", icon: UserPlus, title: "Create user", body: "Add a new user" },
  { href: "/admin/usage", icon: CheckCircle2, title: "View reports", body: "Analytics & API usage logs" },
];

const RANGES: { value: "7d" | "30d" | "90d"; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const summaryQuery = useQuery({ queryKey: ["admin-dashboard-summary"], queryFn: () => apiClient.admin.getDashboardSummary(), refetchInterval: 30_000 });
  const seriesQuery = useQuery({ queryKey: ["admin-dashboard-series", range], queryFn: () => apiClient.admin.getTransactionSeries(range) });
  const activityQuery = useQuery({ queryKey: ["admin-dashboard-activity"], queryFn: () => apiClient.admin.getRecentActivity(), refetchInterval: 30_000 });

  const summary = summaryQuery.data;
  const series = seriesQuery.data ?? [];
  const activity = activityQuery.data ?? [];

  const STATS = [
    { label: "Total Wallet Balance", icon: Wallet, value: summary ? naira(summary.totalWalletBalanceMinor) : null, delta: summary?.deltas.walletBalancePct ?? null },
    {
      label: "Total Payouts",
      icon: Banknote,
      value: summary ? `${naira(summary.totalPayoutsMinor)} · ${summary.totalPayoutsCount}` : null,
      delta: summary?.deltas.payoutsPct ?? null,
    },
    {
      label: "Successful Transactions",
      icon: CheckCircle2,
      value: summary ? summary.successfulTransactionsCount.toLocaleString() : null,
      delta: summary?.deltas.successfulTransactionsPct ?? null,
    },
    { label: "Pending Payouts", icon: Clock, value: summary ? summary.pendingPayoutsCount.toLocaleString() : null, delta: null },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Welcome back, Admin 👋</h2>
        <p className="text-sm text-muted-foreground">Here's what's happening on SAPOK Pay today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, icon: Icon, value, delta }, i) => (
          <Card key={label} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-in-up transition-colors hover:border-primary/40">
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {delta !== undefined && <Delta pct={delta} />}
              </div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="font-display text-xl font-bold text-foreground">{value ?? <span className="inline-block h-6 w-20 animate-pulse rounded bg-muted" />}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="animate-fade-in-up [animation-delay:240ms]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Transaction Overview</CardTitle>
            <div className="flex gap-1 rounded-md bg-muted p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {seriesQuery.isLoading ? <div className="h-[220px] animate-pulse rounded-md bg-muted" /> : <TransactionChart points={series} />}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up [animation-delay:300ms]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activityQuery.isLoading && <MutedText>Loading…</MutedText>}
            {activity.length === 0 && !activityQuery.isLoading && <MutedText>No activity yet.</MutedText>}
            {activity.map((event, i) => (
              <div
                key={event.id}
                style={{ animationDelay: `${340 + i * 50}ms` }}
                className="flex animate-fade-in-up items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                {event.amountMinor !== null && (
                  <span className={`shrink-0 text-sm font-semibold ${event.kind === "PAYOUT" ? "text-danger" : "text-success"}`}>
                    {event.kind === "PAYOUT" ? "-" : "+"}
                    {naira(event.amountMinor)}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_ACTIONS.map(({ href, icon: Icon, title, body }, i) => (
          <Link key={title} href={href} style={{ animationDelay: `${400 + i * 60}ms` }} className="animate-fade-in-up">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex flex-col gap-2 p-5">
                <Icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        <Card
          style={{ animationDelay: `${400 + QUICK_ACTIONS.length * 60}ms` }}
          className="h-full animate-fade-in-up overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10"
        >
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
            <Logo size="sm" />
            <p className="text-xs text-muted-foreground">Powering seamless payments for a smarter future.</p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
