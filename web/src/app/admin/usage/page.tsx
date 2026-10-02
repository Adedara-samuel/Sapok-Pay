"use client";

import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

export default function AdminUsagePage() {
  const usageQuery = useQuery({ queryKey: ["admin-usage"], queryFn: () => apiClient.admin.getUsage() });
  const usage = usageQuery.data;

  return (
    <Shell scope="admin">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">API usage</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Requests made with an API key, by merchant.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Total requests: {usage?.totalEvents ?? "…"}</CardTitle>
        </CardHeader>
        <CardContent>
          {!usage && <MutedText>Loading…</MutedText>}
          {usage?.byMerchant.length === 0 && <MutedText>No API-key traffic yet.</MutedText>}
          <div className="flex flex-col gap-2">
            {usage?.byMerchant.map((row) => (
              <div key={row.merchantId} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span>{row.businessName}</span>
                <span className="font-medium">{row.requestCount} requests</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
