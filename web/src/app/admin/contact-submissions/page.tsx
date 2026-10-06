"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, Send } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { LiveIndicator } from "@/components/live-indicator";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";

const COMPANY_SIZE_LABEL: Record<string, string> = {
  SOLO: "Just them",
  SMALL: "2–10 people",
  MEDIUM: "11–50 people",
  LARGE: "51–200 people",
  ENTERPRISE: "200+ people",
};

function ReplyForm({ submissionId, onSent }: { submissionId: string; onSent: () => void }) {
  const { toast } = useToast();
  const [response, setResponse] = useState("");

  const respondMutation = useMutation({
    mutationFn: () => apiClient.admin.respondToContactSubmission(submissionId, response.trim()),
    onSuccess: () => {
      toast({ variant: "success", title: "Response saved" });
      onSent();
    },
    onError: (error) => toast({ variant: "error", title: "Couldn't save response", description: error instanceof SapokPayApiError ? error.message : "Unknown error" }),
  });

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <textarea
        rows={3}
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Write a response…"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25"
      />
      <Button size="sm" className="self-end" disabled={!response.trim() || respondMutation.isPending} onClick={() => respondMutation.mutate()}>
        <Send className="h-3.5 w-3.5" />
        {respondMutation.isPending ? "Sending…" : "Send response"}
      </Button>
    </div>
  );
}

export default function AdminContactSubmissionsPage() {
  const queryClient = useQueryClient();
  const submissionsQuery = useQuery({ queryKey: ["admin-contact-submissions"], queryFn: () => apiClient.admin.listContactSubmissions(), refetchInterval: 15_000 });
  const submissions = submissionsQuery.data ?? [];
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <AdminShell title="Contact submissions">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Everyone who's reached out through the public "Contact sales" form.</p>
        <LiveIndicator lastUpdated={submissionsQuery.dataUpdatedAt} />
      </div>

      {submissionsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {submissions.length === 0 && !submissionsQuery.isLoading && <MutedText>No contact submissions yet.</MutedText>}

      <div className="flex flex-col gap-3">
        {submissions.map((submission, i) => (
          <Card
            key={submission.id}
            style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            className="animate-fade-in-up transition-all duration-200 hover:border-primary/30 hover:shadow-card"
          >
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {submission.firstName} {submission.lastName} · {submission.companyName}
                  {submission.status === "NEW" ? <Badge variant="danger">New</Badge> : <Badge variant="success">Responded</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {submission.workEmail}
                  {submission.phone ? ` · ${submission.phone}` : ""}
                </p>
              </div>
              <Badge variant="outline">{new Date(submission.createdAt).toLocaleDateString()}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{COMPANY_SIZE_LABEL[submission.companySize] ?? submission.companySize}</Badge>
                <Badge variant="outline">{submission.country}</Badge>
                <Badge variant="outline">{submission.primaryProduct}</Badge>
                {submission.monthlyPaymentVolume && <Badge variant="outline">{submission.monthlyPaymentVolume}</Badge>}
                {submission.companyWebsite && <Badge variant="outline">{submission.companyWebsite}</Badge>}
              </div>
              <p className="text-foreground">{submission.message}</p>
              {submission.wantsUpdates && <MutedText>Opted in to product updates.</MutedText>}

              {submission.status === "RESPONDED" && submission.adminResponse ? (
                <div className="flex items-start gap-2 rounded-md bg-primary/5 p-3">
                  <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-foreground">{submission.adminResponse}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Responded {submission.respondedAt && new Date(submission.respondedAt).toLocaleString()} — recorded here, not sent by email (no email
                      provider is configured yet).
                    </p>
                  </div>
                </div>
              ) : replyingTo === submission.id ? (
                <ReplyForm
                  submissionId={submission.id}
                  onSent={() => {
                    setReplyingTo(null);
                    queryClient.invalidateQueries({ queryKey: ["admin-contact-submissions"] });
                    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
                  }}
                />
              ) : (
                <Button size="sm" variant="outline" className="self-start" onClick={() => setReplyingTo(submission.id)}>
                  <CornerDownRight className="h-3.5 w-3.5" />
                  Respond
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
