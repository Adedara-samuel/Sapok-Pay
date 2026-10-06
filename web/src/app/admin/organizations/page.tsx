"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
import { apiClient } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

export default function AdminOrganizationsPage() {
  const organizationsQuery = useQuery({ queryKey: ["admin-organizations"], queryFn: () => apiClient.admin.listOrganizations(), refetchInterval: 15_000 });
  const organizations = organizationsQuery.data ?? [];

  return (
    <AdminShell title="Organizations">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Every merchant on the platform, including Sapok OneGrid organisations provisioned via the service API.</p>
        <LiveIndicator lastUpdated={organizationsQuery.dataUpdatedAt} />
      </div>

      {organizationsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {organizations.length === 0 && !organizationsQuery.isLoading && <MutedText>No organizations yet.</MutedText>}

      <div className="flex flex-col gap-3">
        {organizations.map((org, i) => (
          <Link key={org.id} href={`/admin/merchants/${org.id}`} style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }} className="animate-fade-in-up">
            <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-primary">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {org.businessName}
                      <Badge variant={org.status === "ACTIVE" ? "success" : "danger"}>{org.status}</Badge>
                      {org.plan && <Badge variant="outline">{org.plan.name}</Badge>}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {org.email} · {org.memberCount} member{org.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-display font-bold text-foreground">{org.wallet ? naira(org.wallet.balanceMinor) : "No wallet"}</p>
                  <p className="text-muted-foreground">{org.activeApiKeyCount} active key(s)</p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">Joined {new Date(org.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
