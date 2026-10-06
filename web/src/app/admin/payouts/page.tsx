"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, CardBody, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
import { apiClient } from "@/lib/api-client";
import type { PayrollBatchStatus } from "@/lib/types";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const STATUS_VARIANT: Record<PayrollBatchStatus, "success" | "danger" | "outline"> = {
  PROCESSING: "outline",
  COMPLETED: "success",
  PARTIALLY_FAILED: "danger",
  FAILED: "danger",
};

export default function AdminPayoutsPage() {
  const payoutsQuery = useQuery({ queryKey: ["admin-payouts"], queryFn: () => apiClient.admin.listPayouts(), refetchInterval: 15_000 });
  const payouts = payoutsQuery.data ?? [];

  return (
    <AdminShell title="Payouts">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Payroll batches submitted by every organization on the platform.</p>
        <LiveIndicator lastUpdated={payoutsQuery.dataUpdatedAt} />
      </div>

      {payoutsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {payouts.length === 0 && !payoutsQuery.isLoading && <MutedText>No payouts yet.</MutedText>}

      <div className="flex flex-col gap-2.5">
        {payouts.map((payout, i) => (
          <Card
            key={payout.id}
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            className="animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
          >
            <CardBody className="flex-row items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Banknote className="h-4 w-4" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {payout.reference}
                    <Badge variant={STATUS_VARIANT[payout.status]}>{payout.status.replace("_", " ")}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payout.organizationName} · {payout.itemCount} recipient{payout.itemCount === 1 ? "" : "s"} · {new Date(payout.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="shrink-0 font-display text-sm font-bold text-foreground">{naira(payout.totalAmountMinor)}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
