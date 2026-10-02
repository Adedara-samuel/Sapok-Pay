"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError, type TransactionStatus } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const STATUS_VARIANT: Record<TransactionStatus, "success" | "danger" | "outline"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  SUCCESSFUL: "success",
  FAILED: "danger",
  REVERSED: "danger",
};

const selectClassName =
  "h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25";

export default function AdminMerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const merchantQuery = useQuery({ queryKey: ["admin-merchant", id], queryFn: () => apiClient.admin.getMerchant(id) });
  const transactionsQuery = useQuery({ queryKey: ["admin-merchant-transactions", id], queryFn: () => apiClient.admin.listMerchantTransactions(id) });

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [description, setDescription] = useState("");

  const adjustMutation = useMutation({
    mutationFn: () =>
      apiClient.admin.postAdjustment(id, { amountMinor: Math.round(Number(amount) * 100), direction, description: description.trim() }, crypto.randomUUID()),
    onSuccess: () => {
      toast({ variant: "success", title: "Adjustment posted" });
      queryClient.invalidateQueries({ queryKey: ["admin-merchant", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-transactions", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setAmount("");
      setDescription("");
    },
    onError: (error) => toast({ variant: "error", title: "Adjustment failed", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const merchant = merchantQuery.data;

  return (
    <AdminShell title={merchant?.businessName ?? "Organization"}>
      {!merchant ? (
        <MutedText>Loading…</MutedText>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
              {merchant.businessName}
              <Badge variant={merchant.status === "ACTIVE" ? "success" : "danger"}>{merchant.status}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">{merchant.email}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Balance: {merchant.wallet ? naira(merchant.wallet.balanceMinor) : "No wallet"}</CardTitle>
              <CardDescription>{merchant.activeApiKeyCount} active API key(s)</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fund wallet / make payout</CardTitle>
              <CardDescription>A manual adjustment — a real bank connection posts through the normal deposit/withdrawal flow instead.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adjustment-amount">Amount, NGN</Label>
                  <Input id="adjustment-amount" type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adjustment-direction">Direction</Label>
                  <select id="adjustment-direction" className={selectClassName} value={direction} onChange={(event) => setDirection(event.target.value as "CREDIT" | "DEBIT")}>
                    <option value="CREDIT">CREDIT — fund wallet</option>
                    <option value="DEBIT">DEBIT — payout / deduct</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="adjustment-description">Description</Label>
                <Input id="adjustment-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Reason for this adjustment" />
              </div>
              <Button onClick={() => adjustMutation.mutate()} disabled={!amount || !description.trim() || adjustMutation.isPending} className="self-start">
                {adjustMutation.isPending ? "Posting…" : direction === "CREDIT" ? "Fund wallet" : "Send payout"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {(transactionsQuery.data ?? []).length === 0 && <MutedText>No transactions yet.</MutedText>}
              <div className="flex flex-col gap-2">
                {(transactionsQuery.data ?? []).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{transaction.type}</span>
                      <span className="ml-2 text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{naira(transaction.amountMinor)}</span>
                      <Badge variant={STATUS_VARIANT[transaction.status]}>{transaction.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
