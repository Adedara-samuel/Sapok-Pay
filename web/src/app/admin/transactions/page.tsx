"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Card, CardContent, MutedText } from "@/components/ui";
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
  const transactionsQuery = useQuery({ queryKey: ["admin-transactions"], queryFn: () => apiClient.admin.listTransactions() });
  const transactions = transactionsQuery.data ?? [];

  return (
    <AdminShell title="Transactions">
      <p className="mb-4 text-sm text-muted-foreground">The most recent transactions across every organization on the platform.</p>

      {transactionsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {transactions.length === 0 && !transactionsQuery.isLoading && <MutedText>No transactions yet.</MutedText>}

      <div className="flex flex-col gap-2">
        {transactions.map((txn, i) => (
          <Card key={txn.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in-up">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {txn.type}
                  <Badge variant={STATUS_VARIANT[txn.status]}>{txn.status}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {txn.organizationName} · {new Date(txn.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{naira(txn.amountMinor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
