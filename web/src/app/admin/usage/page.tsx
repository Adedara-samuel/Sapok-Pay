"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Key } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardBody, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
import { apiClient } from "@/lib/api-client";

export default function AdminUsagePage() {
  const usageQuery = useQuery({ queryKey: ["admin-usage"], queryFn: () => apiClient.admin.getUsage(), refetchInterval: 15_000 });
  const usage = usageQuery.data;
  const rows = [...(usage?.byMerchant ?? [])].sort((a, b) => b.requestCount - a.requestCount);
  const maxCount = Math.max(1, ...rows.map((r) => r.requestCount));

  return (
    <AdminShell title="Usage">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Requests made with an API key, by organization.</p>
        <LiveIndicator lastUpdated={usageQuery.dataUpdatedAt} />
      </div>

      <Card className="mb-4 animate-fade-in-up overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-accent/10">
        <CardBody className="flex-row items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Activity className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total API requests</p>
            <p className="font-display text-3xl font-extrabold text-foreground">{usage ? usage.totalEvents.toLocaleString() : <span className="inline-block h-8 w-20 animate-pulse rounded bg-muted" />}</p>
          </div>
        </CardBody>
      </Card>

      <Card className="animate-fade-in-up [animation-delay:80ms]">
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Key className="h-4 w-4" />
          </span>
          <CardTitle>Requests by organization</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {!usage && <MutedText>Loading…</MutedText>}
          {rows.length === 0 && usage && <MutedText>No API-key traffic yet.</MutedText>}
          {rows.map((row, i) => (
            <div key={row.merchantId} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }} className="animate-fade-in-up">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{row.businessName}</span>
                <span className="text-xs font-semibold text-muted-foreground">{row.requestCount.toLocaleString()} requests</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all" style={{ width: `${(row.requestCount / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
