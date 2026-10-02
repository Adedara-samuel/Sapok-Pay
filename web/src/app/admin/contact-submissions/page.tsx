"use client";

import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/shell";
import { Badge, Card, CardContent, CardHeader, CardTitle, MutedText } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

const COMPANY_SIZE_LABEL: Record<string, string> = {
  SOLO: "Just them",
  SMALL: "2–10 people",
  MEDIUM: "11–50 people",
  LARGE: "51–200 people",
  ENTERPRISE: "200+ people",
};

export default function AdminContactSubmissionsPage() {
  const submissionsQuery = useQuery({ queryKey: ["admin-contact-submissions"], queryFn: () => apiClient.admin.listContactSubmissions() });
  const submissions = submissionsQuery.data ?? [];

  return (
    <Shell scope="admin">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Contact submissions</h1>
        <p className="text-sm text-muted-foreground">Everyone who's reached out through the public "Contact sales" form.</p>
      </div>

      {submissionsQuery.isLoading && <MutedText>Loading…</MutedText>}
      {submissions.length === 0 && !submissionsQuery.isLoading && <MutedText>No contact submissions yet.</MutedText>}

      <div className="flex flex-col gap-3">
        {submissions.map((submission) => (
          <Card key={submission.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>
                  {submission.firstName} {submission.lastName} · {submission.companyName}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {submission.workEmail}
                  {submission.phone ? ` · ${submission.phone}` : ""}
                </p>
              </div>
              <Badge variant="outline">{new Date(submission.createdAt).toLocaleDateString()}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{COMPANY_SIZE_LABEL[submission.companySize] ?? submission.companySize}</Badge>
                <Badge variant="outline">{submission.country}</Badge>
                <Badge variant="outline">{submission.primaryProduct}</Badge>
                {submission.monthlyPaymentVolume && <Badge variant="outline">{submission.monthlyPaymentVolume}</Badge>}
                {submission.companyWebsite && <Badge variant="outline">{submission.companyWebsite}</Badge>}
              </div>
              <p className="text-foreground">{submission.message}</p>
              {submission.wantsUpdates && <MutedText>Opted in to product updates.</MutedText>}
            </CardContent>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
