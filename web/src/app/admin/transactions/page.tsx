"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, CardBody, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
import { apiClient } from "@/lib/api-client";
import type { TransactionStatus } from "@/lib/types";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const STATUS_VARIANT: Record<TransactionStatus, "success" | "danger" | "outline"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  SUCCESSFUL: "success",
  FAILED: "danger",
  REVERSED: "danger",
};

export default function AdminTransactionsPage() {
  const transactionsQuery = useQuery({ queryKey: ["admin-transactions"], queryFn: () => apiClient.admin.listTransactions(), refetchInterval: 15_000 });
  const transactions = transactionsQuery.data ?? [];

  return (
    <AdminShell title="Transactions">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">The most recent transactions across every organization on the platform.</p>
        <LiveIndicator lastUpdated={transactionsQuery.dataUpdatedAt} />
      </div>

      {transactionsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {transactions.length === 0 && !transactionsQuery.isLoading && <MutedText>No transactions yet.</MutedText>}

      <div className="flex flex-col gap-2.5">
        {transactions.map((txn, i) => {
          const isCredit = txn.type === "FUNDING" || txn.type === "CREDIT" || txn.type === "REFUND";
          return (
            <Card
              key={txn.id}
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              className="animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <CardBody className="flex-row items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                    {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {txn.type}
                      <Badge variant={STATUS_VARIANT[txn.status]}>{txn.status}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {txn.organizationName} · {new Date(txn.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className={`shrink-0 font-display text-sm font-bold ${isCredit ? "text-success" : "text-foreground"}`}>
                  {isCredit ? "+" : "-"}
                  {naira(txn.amountMinor)}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}
