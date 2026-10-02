"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, MutedText } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError, type WebhookDeliveryStatus } from "@/lib/api-client";

const STATUS_VARIANT: Record<WebhookDeliveryStatus, "success" | "danger"> = { DELIVERED: "success", FAILED: "danger" };

export default function WebhooksPage() {
  return (
    <Shell scope="merchant">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Webhooks</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Get notified when a transaction or payroll batch completes.</p>
      </div>
      <EndpointCard />
      <EventsCard />
    </Shell>
  );
}

function EndpointCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const endpointQuery = useQuery({ queryKey: ["webhook-endpoint"], queryFn: () => apiClient.webhooks.getEndpoint(), retry: false });
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (endpointQuery.data) setUrl(endpointQuery.data.url);
  }, [endpointQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => apiClient.webhooks.setEndpoint(url.trim()),
    onSuccess: () => {
      toast({ variant: "success", title: "Webhook endpoint saved" });
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoint"] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not save endpoint", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const rotateMutation = useMutation({
    mutationFn: () => apiClient.webhooks.rotateSecret(),
    onSuccess: () => {
      toast({ variant: "success", title: "Secret rotated" });
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoint"] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not rotate secret", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const hasEndpoint = !endpointQuery.isError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoint</CardTitle>
        <CardDescription>
          Every event is signed with HMAC-SHA256 in the <code>X-Sapok-Signature</code> header — verify it against your secret before trusting the payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="webhook-url">URL</Label>
          <Input id="webhook-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhooks/sapok-pay" />
        </div>
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!url.trim() || saveMutation.isPending} className="self-start">
          {saveMutation.isPending ? "Saving…" : hasEndpoint ? "Update endpoint" : "Create endpoint"}
        </Button>

        {hasEndpoint && endpointQuery.data && (
          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Label>Signing secret</Label>
            <code className="block break-all rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{endpointQuery.data.secret}</code>
            <Button size="sm" variant="outline" onClick={() => rotateMutation.mutate()} disabled={rotateMutation.isPending} className="self-start">
              <RotateCw className="h-4 w-4" />
              Rotate secret
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventsCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventsQuery = useQuery({ queryKey: ["webhook-events"], queryFn: () => apiClient.webhooks.listEvents() });

  const redeliverMutation = useMutation({
    mutationFn: (id: string) => apiClient.webhooks.redeliver(id),
    onSuccess: (event) => {
      toast({ variant: event.status === "DELIVERED" ? "success" : "error", title: `Redelivery ${event.status.toLowerCase()}` });
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
    },
    onError: (error) => toast({ variant: "error", title: "Redelivery failed", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  const events = eventsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery log</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 && <MutedText>No events yet.</MutedText>}
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">{event.eventType}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">{new Date(event.createdAt).toLocaleString()}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">· {event.attempts} attempt(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[event.status]}>{event.status}</Badge>
                {event.status === "FAILED" && (
                  <Button size="sm" variant="outline" onClick={() => redeliverMutation.mutate(event.id)} disabled={redeliverMutation.isPending}>
                    Redeliver
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
