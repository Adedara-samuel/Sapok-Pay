"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Real-time only — no historical uptime chart, because there's no incident-history table backing one. Showing a fabricated 90-day percentage would be worse than showing nothing. */
export default function StatusPage() {
  const healthQuery = useQuery({ queryKey: ["status-page-health"], queryFn: () => apiClient.health(), refetchInterval: 15_000 });
  const health = healthQuery.data;
  const isError = healthQuery.isError;

  const apiUp = !isError;
  const databaseUp = health?.dependencies.database === "up";
  const redisUp = health?.dependencies.redis === "up";
  const allOperational = apiUp && databaseUp && redisUp;

  const components = [
    { label: "API", up: apiUp },
    { label: "Database", up: databaseUp },
    { label: "Redis (rate limiting & caching)", up: redisUp },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />

      <SiteHeader />

      <section className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className={allOperational ? "border-success/40" : "border-danger/40"}>
          <div className="flex items-center gap-4 p-6 sm:p-8">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${allOperational ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
              {allOperational ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </span>
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {healthQuery.isLoading ? "Checking status…" : allOperational ? "All systems operational" : "Degraded performance"}
              </p>
              <p className="text-sm text-muted-foreground">{health?.timestamp ? `Last checked ${new Date(health.timestamp).toLocaleTimeString()}` : "Checking live status…"}</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex flex-col gap-3">
          {components.map((component) => (
            <Card key={component.label}>
              <div className="flex items-center justify-between p-5">
                <span className="text-sm font-medium text-foreground">{component.label}</span>
                <span className={`flex items-center gap-2 text-sm font-medium ${component.up ? "text-success" : "text-danger"}`}>
                  <span className={`h-2 w-2 rounded-full ${component.up ? "animate-pulse-glow bg-success" : "bg-danger"}`} />
                  {healthQuery.isLoading ? "Checking…" : component.up ? "Operational" : "Down"}
                </span>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          This page polls SAPOK Pay's own health endpoint every 15 seconds — it reflects real, current status, not a historical log.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
