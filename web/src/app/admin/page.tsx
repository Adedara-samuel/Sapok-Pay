"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/shell";
import { Badge, Card, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

export default function AdminMerchantsPage() {
  const merchantsQuery = useQuery({ queryKey: ["admin-merchants"], queryFn: () => apiClient.admin.listMerchants() });
  const merchants = merchantsQuery.data ?? [];

  return (
    <Shell scope="admin">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Merchants</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every merchant on the platform, including Sapok OneGrid organisations provisioned via the service API.</p>
      </div>
      {merchantsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {merchants.length === 0 && !merchantsQuery.isLoading && <MutedText>No merchants yet.</MutedText>}
      <div className="flex flex-col gap-3">
        {merchants.map((merchant) => (
          <Link key={merchant.id} href={`/admin/merchants/${merchant.id}`}>
            <Card className="transition-colors hover:border-slate-400 dark:hover:border-slate-600">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {merchant.businessName}
                    <Badge variant={merchant.status === "ACTIVE" ? "success" : "danger"}>{merchant.status}</Badge>
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{merchant.email}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{merchant.wallet ? naira(merchant.wallet.balanceMinor) : "No wallet"}</p>
                  <p className="text-slate-500 dark:text-slate-400">{merchant.activeApiKeyCount} active key(s)</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
