"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardBody, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
import { apiClient } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

export default function AdminWalletsPage() {
  const organizationsQuery = useQuery({ queryKey: ["admin-organizations"], queryFn: () => apiClient.admin.listOrganizations(), refetchInterval: 15_000 });
  const organizations = organizationsQuery.data ?? [];
  const withWallets = organizations.filter((org) => org.wallet).sort((a, b) => (b.wallet?.balanceMinor ?? 0) - (a.wallet?.balanceMinor ?? 0));
  const totalMinor = withWallets.reduce((sum, org) => sum + (org.wallet?.balanceMinor ?? 0), 0);

  return (
    <AdminShell title="Wallets">
      <Card className="mb-4 animate-fade-in-up overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-accent/10">
        <CardBody className="flex-row items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total balance across every wallet</p>
            <p className="font-display text-3xl font-extrabold text-foreground">{naira(totalMinor)}</p>
          </div>
          <LiveIndicator lastUpdated={organizationsQuery.dataUpdatedAt} />
        </CardBody>
      </Card>

      {organizationsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {withWallets.length === 0 && !organizationsQuery.isLoading && <MutedText>No wallets yet.</MutedText>}

      <div className="flex flex-col gap-2.5">
        {withWallets.map((org, i) => (
          <Link key={org.id} href={`/admin/merchants/${org.id}`} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }} className="animate-fade-in-up">
            <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
              <CardBody className="flex-row items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{org.businessName}</p>
                    <p className="text-xs text-muted-foreground">{org.email}</p>
                  </div>
                </div>
                <p className="shrink-0 font-display text-base font-bold text-foreground">{naira(org.wallet!.balanceMinor)}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
