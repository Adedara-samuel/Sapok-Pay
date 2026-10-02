"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Mail } from "lucide-react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useToast } from "@/components/toast";
import { apiClient, SapokPayApiError } from "@/lib/api-client";
import type { CompanySize } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const naira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;
const bpsToPercent = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: "SOLO", label: "Just me" },
  { value: "SMALL", label: "2–10 people" },
  { value: "MEDIUM", label: "11–50 people" },
  { value: "LARGE", label: "51–200 people" },
  { value: "ENTERPRISE", label: "200+ people" },
];

const PAYMENT_VOLUMES = ["Under ₦1,000,000/mo", "₦1,000,000 – ₦10,000,000/mo", "₦10,000,000 – ₦100,000,000/mo", "Over ₦100,000,000/mo", "Not sure yet"];

const TRUST_POINTS = ["A live wallet from the moment you sign up", "Idempotent transfers — safe to retry, never double-charged", "Signed webhooks for every transaction and payroll event"];

const selectClassName =
  "h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25";

export default function ContactPage() {
  const { toast } = useToast();
  const settingsQuery = useQuery({ queryKey: ["site-settings"], queryFn: () => apiClient.siteSettings.getPublic() });
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => apiClient.plans.listPublic() });
  const settings = settingsQuery.data;
  const plans = plansQuery.data ?? [];

  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize>("SMALL");
  const [primaryProduct, setPrimaryProduct] = useState("");
  const [country, setCountry] = useState("");
  const [monthlyPaymentVolume, setMonthlyPaymentVolume] = useState("");
  const [message, setMessage] = useState("");
  const [wantsUpdates, setWantsUpdates] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () =>
      apiClient.contact.submit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        workEmail: workEmail.trim(),
        phone: phone.trim() || undefined,
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim() || undefined,
        companySize,
        primaryProduct: primaryProduct.trim(),
        country: country.trim(),
        monthlyPaymentVolume: monthlyPaymentVolume || undefined,
        message: message.trim(),
        wantsUpdates,
      }),
    onSuccess: () => setSubmitted(true),
    onError: (error) =>
      toast({ variant: "error", title: "Couldn't send your message", description: error instanceof SapokPayApiError ? error.message : "Please try again." }),
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.14),transparent_55%)]" />

      <SiteHeader />

      <section className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl">{settings?.contact_heading ?? "Talk to us"}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {settings?.contact_body ?? "Questions about integrating SAPOK Pay? Reach out and a real person will get back to you."}
        </p>
      </section>

      <section className="relative mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="p-6 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="font-display text-xl font-bold text-foreground">Message sent</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Thanks, {firstName || "there"} — we've received your message and will get back to you at {workEmail}.
                </p>
              </div>
            ) : (
              <form
                className="flex flex-col gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitMutation.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="workEmail">Work email</Label>
                  <Input id="workEmail" type="email" required value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} placeholder="you@business.com" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">Phone number (optional)</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 805 250 6710" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input id="companyName" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="companyWebsite">Company website (optional)</Label>
                    <Input id="companyWebsite" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="acme.com" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="companySize">Company size</Label>
                    <select id="companySize" className={selectClassName} value={companySize} onChange={(e) => setCompanySize(e.target.value as CompanySize)}>
                      {COMPANY_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="primaryProduct">What does your product do?</Label>
                  <Input
                    id="primaryProduct"
                    required
                    value={primaryProduct}
                    onChange={(e) => setPrimaryProduct(e.target.value)}
                    placeholder="e.g. E-commerce, marketplace, SaaS billing"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monthlyPaymentVolume">Expected monthly payment volume (optional)</Label>
                  <select id="monthlyPaymentVolume" className={selectClassName} value={monthlyPaymentVolume} onChange={(e) => setMonthlyPaymentVolume(e.target.value)}>
                    <option value="">Select a range</option>
                    {PAYMENT_VOLUMES.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="message">Tell us more</Label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What are you building, and what would you like help with?"
                    className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <input type="checkbox" className="mt-0.5" checked={wantsUpdates} onChange={(e) => setWantsUpdates(e.target.checked)} />
                  Send me occasional SAPOK Pay updates and announcements.
                </label>

                <Button type="submit" disabled={submitMutation.isPending} className="mt-1">
                  {submitMutation.isPending ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-3 p-6">
              <p className="font-display text-sm font-bold text-foreground">What you get</p>
              <ul className="flex flex-col gap-2.5">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {plans.length > 0 && (
            <Card>
              <div className="flex flex-col gap-3 p-6">
                <p className="font-display text-sm font-bold text-foreground">Pricing at a glance</p>
                {plans.map((plan) => (
                  <div key={plan.key} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{plan.name}</span>
                    <span className="text-muted-foreground">
                      {naira(plan.priceMinor)}/mo + {bpsToPercent(plan.transactionFeeBps)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {settings?.contact_email && (
            <Card>
              <div className="flex flex-col gap-2 p-6">
                <p className="font-display text-sm font-bold text-foreground">Prefer email?</p>
                <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-4 w-4" />
                  {settings.contact_email}
                </a>
              </div>
            </Card>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
