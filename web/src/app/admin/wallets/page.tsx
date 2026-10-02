"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, MutedText } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

export default function AdminWalletsPage() {
  const organizationsQuery = useQuery({ queryKey: ["admin-organizations"], queryFn: () => apiClient.admin.listOrganizations() });
  const organizations = organizationsQuery.data ?? [];
  const withWallets = organizations.filter((org) => org.wallet).sort((a, b) => (b.wallet?.balanceMinor ?? 0) - (a.wallet?.balanceMinor ?? 0));
  const totalMinor = withWallets.reduce((sum, org) => sum + (org.wallet?.balanceMinor ?? 0), 0);

  return (
    <AdminShell title="Wallets">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Every organization's wallet, sorted by balance.</p>
        <p className="font-display text-lg font-bold text-foreground">{naira(totalMinor)} total</p>
      </div>

      {organizationsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {withWallets.length === 0 && !organizationsQuery.isLoading && <MutedText>No wallets yet.</MutedText>}

      <div className="flex flex-col gap-2">
        {withWallets.map((org, i) => (
          <Link key={org.id} href={`/admin/merchants/${org.id}`} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in-up">
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{org.businessName}</p>
                  <p className="text-xs text-muted-foreground">{org.email}</p>
                </div>
                <p className="font-display text-base font-bold text-foreground">{naira(org.wallet!.balanceMinor)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
