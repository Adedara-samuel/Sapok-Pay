"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Banknote, Building2, Receipt } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, CardBody, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
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

export default function AdminMerchantDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const merchantQuery = useQuery({ queryKey: ["admin-merchant", id], queryFn: () => apiClient.admin.getMerchant(id), refetchInterval: 15_000 });
  const transactionsQuery = useQuery({ queryKey: ["admin-merchant-transactions", id], queryFn: () => apiClient.admin.listMerchantTransactions(id), refetchInterval: 15_000 });

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
          <div className="flex items-center gap-3 animate-fade-in-up">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 text-primary">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                {merchant.businessName}
                <Badge variant={merchant.status === "ACTIVE" ? "success" : "danger"}>{merchant.status}</Badge>
              </h2>
              <p className="text-sm text-muted-foreground">{merchant.email}</p>
            </div>
          </div>

          <Card className="animate-fade-in-up [animation-delay:60ms] overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-accent/10">
            <CardBody className="flex-row items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Wallet balance</p>
                <p className="font-display text-3xl font-extrabold text-foreground">{merchant.wallet ? naira(merchant.wallet.balanceMinor) : "No wallet"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{merchant.activeApiKeyCount} active API key(s)</p>
              </div>
              <LiveIndicator lastUpdated={merchantQuery.dataUpdatedAt} />
            </CardBody>
          </Card>

          <Card className="animate-fade-in-up [animation-delay:120ms]">
            <CardHeader className="flex-row items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Banknote className="h-4 w-4" />
              </span>
              <div>
                <CardTitle>Fund wallet / make payout</CardTitle>
                <CardDescription>A manual adjustment — a real bank connection posts through the normal deposit/withdrawal flow instead.</CardDescription>
              </div>
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

          <Card className="animate-fade-in-up [animation-delay:180ms]">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-4 w-4" />
                </span>
                <CardTitle>Transactions</CardTitle>
              </div>
              <LiveIndicator lastUpdated={transactionsQuery.dataUpdatedAt} />
            </CardHeader>
            <CardContent>
              {(transactionsQuery.data ?? []).length === 0 && <MutedText>No transactions yet.</MutedText>}
              <div className="flex flex-col gap-2">
                {(transactionsQuery.data ?? []).map((transaction, i) => {
                  const isCredit = transaction.type === "FUNDING" || transaction.type === "CREDIT" || transaction.type === "REFUND";
                  return (
                    <div
                      key={transaction.id}
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                      className="flex animate-fade-in-up items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                          {isCredit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        </span>
                        <div>
                          <span className="font-medium text-foreground">{transaction.type}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-foreground">{naira(transaction.amountMinor)}</span>
                        <Badge variant={STATUS_VARIANT[transaction.status]}>{transaction.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
