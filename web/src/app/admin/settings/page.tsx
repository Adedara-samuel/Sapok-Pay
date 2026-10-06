"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Globe } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";
import type { PlanDetailed } from "@/lib/types";

const nairaToMinor = (naira: string) => Math.round(Number(naira) * 100);
const minorToNaira = (minor: number) => (minor / 100).toString();
const bpsToPercent = (bps: number) => (bps / 100).toString();
const percentToBps = (percent: string) => Math.round(Number(percent) * 100);

function PlanEditor({ plan }: { plan: PlanDetailed }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(minorToNaira(plan.priceMinor));
  const [fee, setFee] = useState(bpsToPercent(plan.transactionFeeBps));

  const saveMutation = useMutation({
    mutationFn: () => apiClient.admin.updatePlanPricing(plan.id, { name: name.trim(), priceMinor: nairaToMinor(price), transactionFeeBps: percentToBps(fee) }),
    onSuccess: () => {
      toast({ variant: "success", title: `${name} updated` });
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => toast({ variant: "error", title: "Couldn't update plan", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const dirty = name !== plan.name || price !== minorToNaira(plan.priceMinor) || fee !== bpsToPercent(plan.transactionFeeBps);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/30">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${plan.id}-name`}>Plan name</Label>
        <Input id={`${plan.id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${plan.id}-price`}>Price, NGN/mo</Label>
          <Input id={`${plan.id}-price`} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${plan.id}-fee`}>Transaction fee, %</Label>
          <Input id={`${plan.id}-fee`} type="number" min={0} step={0.01} value={fee} onChange={(e) => setFee(e.target.value)} />
        </div>
      </div>
      <Button size="sm" className="self-start" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        {saveMutation.isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const settingsQuery = useQuery({ queryKey: ["admin-site-settings"], queryFn: () => apiClient.admin.listSiteSettings() });
  const plansQuery = useQuery({ queryKey: ["admin-subscription-plans"], queryFn: () => apiClient.admin.listSubscriptionPlans() });
  const plans = plansQuery.data ?? [];

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settingsQuery.data) setValues(Object.fromEntries(settingsQuery.data.map((field) => [field.key, field.value])));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => apiClient.admin.updateSiteSettings(values),
    onSuccess: () => toast({ variant: "success", title: "Site content updated" }),
    onError: (error) => toast({ variant: "error", title: "Couldn't save", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const dirty = settingsQuery.data?.some((field) => values[field.key] !== field.value) ?? false;

  return (
    <AdminShell title="Settings">
      <div className="flex flex-col gap-6">
        <Card className="animate-fade-in-up">
          <CardHeader className="flex-row items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-primary">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Website content</CardTitle>
              <CardDescription>Everything editable here is what the public marketing site actually renders — hero copy, contact details, the closing call-to-action.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {settingsQuery.isLoading && <MutedText>Loading…</MutedText>}
            {settingsQuery.data?.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <p className="text-xs text-muted-foreground">{field.description}</p>
                {field.value.length > 80 ? (
                  <textarea
                    id={field.key}
                    rows={3}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                ) : (
                  <Input id={field.key} value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} />
                )}
              </div>
            ))}
            <Button className="self-start" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up [animation-delay:80ms]">
          <CardHeader className="flex-row items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-primary">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Subscription plans</CardTitle>
              <CardDescription>What the public pricing page shows, and what every organization is actually billed.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {plansQuery.isLoading && <MutedText>Loading…</MutedText>}
            {plans.map((plan) => (
              <PlanEditor key={plan.id} plan={plan} />
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
