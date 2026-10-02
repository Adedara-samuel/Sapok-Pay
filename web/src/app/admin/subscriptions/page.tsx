"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, CardContent, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";
import type { SubscriptionStatus } from "@/lib/types";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const STATUS_VARIANT: Record<SubscriptionStatus, "success" | "danger" | "outline"> = {
  ACTIVE: "success",
  PAST_DUE: "danger",
  CANCELED: "outline",
};

const selectClassName =
  "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25";

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subscriptionsQuery = useQuery({ queryKey: ["admin-subscriptions"], queryFn: () => apiClient.admin.listSubscriptions() });
  const plansQuery = useQuery({ queryKey: ["admin-subscription-plans"], queryFn: () => apiClient.admin.listSubscriptionPlans() });
  const subscriptions = subscriptionsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  const changePlanMutation = useMutation({
    mutationFn: ({ organizationId, planKey }: { organizationId: string; planKey: string }) => apiClient.admin.updateMerchantSubscription(organizationId, planKey),
    onSuccess: () => {
      toast({ variant: "success", title: "Plan updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (error) => toast({ variant: "error", title: "Couldn't change plan", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  return (
    <AdminShell title="Subscriptions">
      <p className="mb-4 text-sm text-muted-foreground">Every organization's billing plan — change it here and the new rate applies immediately.</p>

      {subscriptionsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {subscriptions.length === 0 && !subscriptionsQuery.isLoading && <MutedText>No subscriptions yet.</MutedText>}

      <div className="flex flex-col gap-2">
        {subscriptions.map((sub, i) => (
          <Card key={sub.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in-up">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {sub.organizationName}
                  <Badge variant={STATUS_VARIANT[sub.status]}>{sub.status}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {sub.organizationEmail} · {naira(sub.plan.priceMinor)}/mo · renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <select
                className={selectClassName}
                value={sub.plan.key}
                disabled={changePlanMutation.isPending}
                onChange={(e) => changePlanMutation.mutate({ organizationId: sub.organizationId, planKey: e.target.value })}
              >
                {plans.map((plan) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
