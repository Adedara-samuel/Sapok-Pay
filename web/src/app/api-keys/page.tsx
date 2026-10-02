"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const keysQuery = useQuery({ queryKey: ["api-keys"], queryFn: () => apiClient.apiKeys.list() });
  const [name, setName] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => apiClient.apiKeys.create(name.trim()),
    onSuccess: (key) => {
      setJustCreatedKey(key.rawKey);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setName("");
    },
    onError: (error) => toast({ variant: "error", title: "Could not create key", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.apiKeys.revoke(id),
    onSuccess: () => {
      toast({ variant: "success", title: "Key revoked" });
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not revoke key", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const keys = keysQuery.data ?? [];

  return (
    <Shell scope="merchant">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">API keys</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Use these to call SAPOK Pay from your own application. Shown in full only once, at creation.</p>
      </div>

      {justCreatedKey && (
        <Card className="border-emerald-400 dark:border-emerald-600">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Copy this key now — it won&apos;t be shown again.</p>
            <code className="mt-2 block break-all rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{justCreatedKey}</code>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setJustCreatedKey(null)}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a key</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="e.g. Production backend" value={name} onChange={(event) => setName(event.target.value)} />
          <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 && <MutedText>No API keys yet.</MutedText>}
          <div className="flex flex-col gap-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{key.name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">{key.prefix}…</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.status === "ACTIVE" ? "success" : "danger"}>{key.status}</Badge>
                  {key.status === "ACTIVE" && (
                    <Button size="sm" variant="ghost" onClick={() => revokeMutation.mutate(key.id)} disabled={revokeMutation.isPending} aria-label="Revoke">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
