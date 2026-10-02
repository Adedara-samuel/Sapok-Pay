"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError, type Transaction, type TransactionStatus } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const STATUS_VARIANT: Record<TransactionStatus, "success" | "danger" | "outline" | "default"> = {
  PENDING: "outline",
  PROCESSING: "outline",
  SUCCESSFUL: "success",
  FAILED: "danger",
  REVERSED: "danger",
};

export default function WalletPage() {
  return (
    <Shell scope="merchant">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Wallet</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your balance, linked bank accounts, and transaction history.</p>
      </div>
      <BalanceCard />
      <BankAccountsCard />
      <TransactionsCard />
    </Shell>
  );
}

function BalanceCard() {
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => apiClient.wallet.getMine() });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance</CardTitle>
      </CardHeader>
      <CardContent>
        {walletQuery.isLoading && <MutedText>Loading…</MutedText>}
        {walletQuery.data && <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{naira(walletQuery.data.balanceMinor)}</p>}
      </CardContent>
    </Card>
  );
}

function BankAccountsCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const accountsQuery = useQuery({ queryKey: ["bank-accounts"], queryFn: () => apiClient.bankAccounts.list() });
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const linkMutation = useMutation({
    mutationFn: () => apiClient.bankAccounts.link(accountNumber.trim()),
    onSuccess: (account) => {
      toast({ variant: "success", title: "Bank account linked", description: `Verified as ${account.accountName}` });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setAccountNumber("");
    },
    onError: (error) => {
      toast({ variant: "error", title: "Could not link account", description: error instanceof SapokPayApiError ? error.message : "Unknown error" });
    },
  });

  const depositMutation = useMutation({
    mutationFn: () => apiClient.transfers.deposit(selectedAccountId, Math.round(Number(depositAmount) * 100), crypto.randomUUID()),
    onSuccess: (transaction) => {
      toast({
        variant: transaction.status === "SUCCESSFUL" ? "success" : "error",
        title: `Deposit ${transaction.status.toLowerCase()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setDepositAmount("");
    },
    onError: (error) => toast({ variant: "error", title: "Deposit failed", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => apiClient.transfers.withdraw(selectedAccountId, Math.round(Number(withdrawAmount) * 100), crypto.randomUUID()),
    onSuccess: (transaction) => {
      toast({
        variant: transaction.status === "SUCCESSFUL" ? "success" : "error",
        title: `Withdrawal ${transaction.status.toLowerCase()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setWithdrawAmount("");
    },
    onError: (error) => toast({ variant: "error", title: "Withdrawal failed", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const accounts = accountsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank accounts</CardTitle>
        <CardDescription>Link an account, then deposit from it or withdraw to it. 10-digit account numbers only (mock bank).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="1234567890" maxLength={10} />
          <Button size="sm" onClick={() => linkMutation.mutate()} disabled={accountNumber.trim().length !== 10 || linkMutation.isPending}>
            <Plus className="h-4 w-4" />
            Link
          </Button>
        </div>

        {accounts.length === 0 ? (
          <MutedText>No bank accounts linked yet.</MutedText>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {accounts.map((account) => (
              <li key={account.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                {account.accountName} · {account.accountNumber}
              </li>
            ))}
          </ul>
        )}

        {accounts.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-account">Account for deposit/withdrawal</Label>
              <select
                id="transfer-account"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
              >
                <option value="">Select an account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountName} · {account.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="deposit-amount">Deposit, NGN</Label>
                  <Input id="deposit-amount" type="number" min={0} value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} />
                </div>
                <Button
                  size="sm"
                  onClick={() => depositMutation.mutate()}
                  disabled={!selectedAccountId || !depositAmount || depositMutation.isPending}
                >
                  Deposit
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="withdraw-amount">Withdraw, NGN</Label>
                  <Input id="withdraw-amount" type="number" min={0} value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => withdrawMutation.mutate()}
                  disabled={!selectedAccountId || !withdrawAmount || withdrawMutation.isPending}
                >
                  Withdraw
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionsCard() {
  const transactionsQuery = useQuery({ queryKey: ["transactions"], queryFn: () => apiClient.wallet.listTransactions() });
  const transactions = transactionsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactionsQuery.isLoading && <MutedText>Loading…</MutedText>}
        {transactions.length === 0 && !transactionsQuery.isLoading && <MutedText>No transactions yet.</MutedText>}
        <div className="flex flex-col gap-2">
          {transactions.map((transaction: Transaction) => (
            <div key={transaction.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">{transaction.type}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">{new Date(transaction.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{naira(transaction.amountMinor)}</span>
                <Badge variant={STATUS_VARIANT[transaction.status]}>{transaction.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
