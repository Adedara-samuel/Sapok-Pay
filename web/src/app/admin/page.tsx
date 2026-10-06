"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowDownLeft, ArrowRight, ArrowUp, ArrowUpRight, Banknote, Building2, CheckCircle2, Clock, UserPlus, Wallet, Zap } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardBody, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { TransactionChart } from "@/components/admin-transaction-chart";
import { LiveIndicator } from "@/components/live-indicator";
import { MiniSparkline } from "@/components/mini-sparkline";
import { apiClient } from "@/lib/api-client";
import { Logo } from "@/components/wordmark";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[0.7rem] text-muted-foreground">No prior period</span>;
  const up = pct >= 0;
  return (
    <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${up ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
  const summaryQuery = useQuery({ queryKey: ["admin-dashboard-summary"], queryFn: () => apiClient.admin.getDashboardSummary(), refetchInterval: 15_000 });
  const seriesQuery = useQuery({ queryKey: ["admin-dashboard-series", range], queryFn: () => apiClient.admin.getTransactionSeries(range) });
  const activityQuery = useQuery({ queryKey: ["admin-dashboard-activity"], queryFn: () => apiClient.admin.getRecentActivity(), refetchInterval: 15_000 });

  const summary = summaryQuery.data;
  const series = seriesQuery.data ?? [];
  const activity = activityQuery.data ?? [];
  const transactionCounts = series.map((p) => p.count);

  const STATS = [
    {
      label: "Total Wallet Balance",
      icon: Wallet,
      value: summary ? naira(summary.totalWalletBalanceMinor) : null,
      delta: summary?.deltas.walletBalancePct ?? null,
      sparkline: null,
    },
    {
      label: "Total Payouts",
      icon: Banknote,
      value: summary ? naira(summary.totalPayoutsMinor) : null,
      sub: summary ? `${summary.totalPayoutsCount} payout${summary.totalPayoutsCount === 1 ? "" : "s"}` : null,
      delta: summary?.deltas.payoutsPct ?? null,
      sparkline: null,
    },
    {
      label: "Successful Transactions",
      icon: CheckCircle2,
      value: summary ? summary.successfulTransactionsCount.toLocaleString() : null,
      delta: summary?.deltas.successfulTransactionsPct ?? null,
      sparkline: transactionCounts,
    },
    {
      label: "Pending Payouts",
      icon: Clock,
      value: summary ? summary.pendingPayoutsCount.toLocaleString() : null,
      delta: null,
      sparkline: null,
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{greeting()}, Admin 👋</h2>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening on SAPOK Pay right now.</p>
        </div>
        <LiveIndicator lastUpdated={summaryQuery.dataUpdatedAt} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, icon: Icon, value, sub, delta, sparkline }, i) => (
          <Card
            key={label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
          >
            <CardBody className="gap-3">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {delta !== undefined && <Delta pct={delta} />}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-0.5 font-display text-2xl font-extrabold tracking-tight text-foreground">
                  {value ?? <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" />}
                </p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </div>
              {sparkline && sparkline.length > 1 && <MiniSparkline values={sparkline} className="h-7 w-full text-primary" />}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="animate-fade-in-up self-start [animation-delay:280ms]">
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
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            {seriesQuery.isLoading ? <div className="h-[220px] animate-pulse rounded-md bg-muted" /> : <TransactionChart points={series} />}
          </div>
        </Card>

        <Card className="animate-fade-in-up [animation-delay:340ms]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <LiveIndicator lastUpdated={activityQuery.dataUpdatedAt} />
          </CardHeader>
          <div className="flex flex-col gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
            {activityQuery.isLoading && <MutedText>Loading…</MutedText>}
            {activity.length === 0 && !activityQuery.isLoading && <MutedText>No activity yet.</MutedText>}
            {activity.map((event, i) => {
              const isPayout = event.kind === "PAYOUT";
              const isSignup = event.kind === "ORGANIZATION_CREATED";
              const Icon = isSignup ? Building2 : isPayout ? ArrowUpRight : ArrowDownLeft;
              const tone = isSignup ? "bg-primary/10 text-primary" : isPayout ? "bg-danger/15 text-danger" : "bg-success/15 text-success";
              return (
                <div
                  key={event.id}
                  style={{ animationDelay: `${380 + Math.min(i * 50, 250)}ms` }}
                  className="flex animate-fade-in-up items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {event.amountMinor !== null && (
                    <span className={`shrink-0 font-display text-sm font-bold ${isPayout ? "text-danger" : "text-success"}`}>
                      {isPayout ? "-" : "+"}
                      {naira(event.amountMinor)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <h3 className="mb-3 mt-6 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Quick actions</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_ACTIONS.map(({ href, icon: Icon, title, body }, i) => (
          <Link key={title} href={href} style={{ animationDelay: `${440 + i * 60}ms` }} className="group animate-fade-in-up">
            <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
              <CardBody className="gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{body}</p>
                <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </CardBody>
            </Card>
          </Link>
        ))}
        <Card
          style={{ animationDelay: `${440 + QUICK_ACTIONS.length * 60}ms` }}
          className="h-full animate-fade-in-up overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-accent/10"
        >
          <CardBody className="h-full items-center justify-center gap-2 text-center">
            <Logo size="sm" />
            <p className="text-xs text-muted-foreground">Powering seamless payments for a smarter future.</p>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}
