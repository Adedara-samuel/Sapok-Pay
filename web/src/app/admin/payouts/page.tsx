"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, CardContent, MutedText } from "@/components/ui";
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
  const payoutsQuery = useQuery({ queryKey: ["admin-payouts"], queryFn: () => apiClient.admin.listPayouts() });
  const payouts = payoutsQuery.data ?? [];

  return (
    <AdminShell title="Payouts">
      <p className="mb-4 text-sm text-muted-foreground">Payroll batches submitted by every organization on the platform.</p>

      {payoutsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {payouts.length === 0 && !payoutsQuery.isLoading && <MutedText>No payouts yet.</MutedText>}

      <div className="flex flex-col gap-2">
        {payouts.map((payout, i) => (
          <Card key={payout.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in-up">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {payout.reference}
                  <Badge variant={STATUS_VARIANT[payout.status]}>{payout.status.replace("_", " ")}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {payout.organizationName} · {payout.itemCount} recipient{payout.itemCount === 1 ? "" : "s"} · {new Date(payout.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{naira(payout.totalAmountMinor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
