"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Play, Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError, type PayrollBatchItemStatus, type PayrollBatchStatus } from "@/lib/api-client";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

const BATCH_STATUS_VARIANT: Record<PayrollBatchStatus, "success" | "danger" | "outline"> = {
  PROCESSING: "outline",
  COMPLETED: "success",
  PARTIALLY_FAILED: "danger",
  FAILED: "danger",
};

const ITEM_STATUS_VARIANT: Record<PayrollBatchItemStatus, "success" | "danger"> = { SUCCESSFUL: "success", FAILED: "danger" };

interface DraftItem {
  recipientAccountNumber: string;
  amountMajor: string;
  recipientLabel: string;
}

export default function PayrollBatchesPage() {
  return (
    <Shell>
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Payroll batches</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pay many recipients at once — each item is verified and processed independently.</p>
      </div>
      <CreateBatchForm />
      <BatchesList />
    </Shell>
  );
}

function CreateBatchForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<DraftItem[]>([{ recipientAccountNumber: "", amountMajor: "", recipientLabel: "" }]);

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const addItem = () => setItems((current) => [...current, { recipientAccountNumber: "", amountMajor: "", recipientLabel: "" }]);
  const removeItem = (index: number) => setItems((current) => current.filter((_, i) => i !== index));

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.payrollBatches.create(
        items.map((item) => ({
          recipientAccountNumber: item.recipientAccountNumber.trim(),
          amountMinor: Math.round(Number(item.amountMajor) * 100),
          recipientLabel: item.recipientLabel.trim() || undefined,
        })),
        crypto.randomUUID(),
      ),
    onSuccess: (batch) => {
      const successCount = batch.items.filter((item) => item.status === "SUCCESSFUL").length;
      toast({
        variant: batch.status === "COMPLETED" ? "success" : "error",
        title: `Batch ${batch.status.toLowerCase().replace("_", " ")}`,
        description: `${successCount}/${batch.items.length} succeeded`,
      });
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setItems([{ recipientAccountNumber: "", amountMajor: "", recipientLabel: "" }]);
    },
    onError: (error) => {
      toast({ variant: "error", title: "Batch failed", description: error instanceof SapokPayApiError ? error.message : "Unknown error" });
    },
  });

  const canSubmit = items.every((item) => item.recipientAccountNumber.trim() && Number(item.amountMajor) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New batch</CardTitle>
        <CardDescription>A malformed account number only fails that row — the rest of the batch still processes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_1.5fr_auto]">
              <Input
                placeholder="Account number"
                value={item.recipientAccountNumber}
                onChange={(event) => updateItem(index, { recipientAccountNumber: event.target.value })}
              />
              <Input placeholder="Amount, NGN" type="number" min={0} value={item.amountMajor} onChange={(event) => updateItem(index, { amountMajor: event.target.value })} />
              <Input placeholder="Label (optional)" value={item.recipientLabel} onChange={(event) => updateItem(index, { recipientLabel: event.target.value })} />
              <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length === 1} aria-label="Remove row">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
          <Button size="sm" onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
            <Play className="h-4 w-4" />
            {createMutation.isPending ? "Processing…" : "Submit batch"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BatchesList() {
  const batchesQuery = useQuery({ queryKey: ["payroll-batches"], queryFn: () => apiClient.payrollBatches.list() });
  const batches = batchesQuery.data ?? [];

  if (batchesQuery.isLoading) return <MutedText>Loading batches…</MutedText>;
  if (batches.length === 0) return <MutedText>No payroll batches yet.</MutedText>;

  return (
    <div className="flex flex-col gap-3">
      {batches.map((batch) => (
        <BatchRow key={batch.id} batchId={batch.id} />
      ))}
    </div>
  );
}

function BatchRow({ batchId }: { batchId: string }) {
  const [expanded, setExpanded] = useState(false);
  const batchQuery = useQuery({ queryKey: ["payroll-batch", batchId], queryFn: () => apiClient.payrollBatches.findById(batchId), enabled: expanded });
  const summaryQuery = useQuery({ queryKey: ["payroll-batches"], queryFn: () => apiClient.payrollBatches.list() });
  const summary = (summaryQuery.data ?? []).find((b) => b.id === batchId);
  if (!summary) return null;

  return (
    <Card>
      <CardHeader className="cursor-pointer flex-row items-start justify-between gap-4" onClick={() => setExpanded((value) => !value)}>
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {summary.reference}
            <Badge variant={BATCH_STATUS_VARIANT[summary.status]}>{summary.status.replace("_", " ")}</Badge>
          </CardTitle>
          <CardDescription>
            {naira(summary.totalAmountMinor)} total · {new Date(summary.createdAt).toLocaleString()}
          </CardDescription>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </CardHeader>
      {expanded && (
        <CardContent className="border-t border-slate-200 pt-4 dark:border-slate-800">
          {!batchQuery.data ? (
            <MutedText>Loading items…</MutedText>
          ) : (
            <div className="flex flex-col gap-2">
              {batchQuery.data.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.recipientAccountName ?? item.recipientAccountNumber}</span>
                    {item.recipientLabel && <span className="ml-2 text-slate-500 dark:text-slate-400">{item.recipientLabel}</span>}
                    {item.failureReason && <p className="text-xs text-red-500">{item.failureReason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{naira(item.amountMinor)}</span>
                    <Badge variant={ITEM_STATUS_VARIANT[item.status]}>{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
