"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

export default function AdminUsagePage() {
  const usageQuery = useQuery({ queryKey: ["admin-usage"], queryFn: () => apiClient.admin.getUsage() });
  const usage = usageQuery.data;

  return (
    <AdminShell title="Usage">
      <p className="mb-4 text-sm text-muted-foreground">Requests made with an API key, by organization.</p>
      <Card>
        <CardHeader>
          <CardTitle>Total requests: {usage?.totalEvents ?? "…"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!usage && <MutedText>Loading…</MutedText>}
          {usage?.byMerchant.length === 0 && <MutedText>No API-key traffic yet.</MutedText>}
          <div className="flex flex-col gap-2">
            {usage?.byMerchant.map((row) => (
              <div key={row.merchantId} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{row.businessName}</span>
                <span className="font-medium text-foreground">{row.requestCount} requests</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
