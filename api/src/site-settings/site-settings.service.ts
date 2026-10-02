import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SiteSettingDef {
  key: string;
  label: string;
  description: string;
  default: string;
}

/**
 * Every piece of public-site copy a super admin can edit from the admin
 * platform, with its fallback default. Nothing outside this list is ever
 * readable or writable through the API — the public endpoint is never a
 * generic arbitrary-key store, only this whitelist.
 */
export const SITE_SETTING_DEFS: SiteSettingDef[] = [
  { key: "hero_eyebrow", label: "Hero eyebrow", description: "Small badge above the hero headline", default: "Powered by SAPOK" },
  { key: "hero_headline", label: "Hero headline", description: "Main hero title", default: "Payments infrastructure, wired right." },
  {
    key: "hero_subheadline",
    label: "Hero subheadline",
    description: "Supporting paragraph under the hero headline",
    default:
      "SAPOK Pay gives every merchant a wallet, a bank connection and a set of signed webhooks on day one — the payments layer other products build on, not another dashboard to babysit.",
  },
  { key: "contact_email", label: "Contact email", description: "Shown in the Contact section and the footer", default: "hello@sapokpay.com" },
  { key: "contact_heading", label: "Contact heading", description: "Title of the Contact section", default: "Talk to us" },
  {
    key: "contact_body",
    label: "Contact body",
    description: "Supporting line in the Contact section",
    default: "Questions about integrating SAPOK Pay, or about a specific merchant account? Reach out and a real person will get back to you.",
  },
  { key: "footer_tagline", label: "Footer tagline", description: "Short line under the footer logo", default: "Modern payments infrastructure, built for the long run." },
  { key: "cta_headline", label: "Final CTA headline", description: "Headline on the bottom call-to-action band", default: "Start moving money today." },
  {
    key: "cta_subheadline",
    label: "Final CTA subheadline",
    description: "Supporting line on the bottom call-to-action band",
    default: "Create a merchant account and you'll have a live wallet before you've finished reading the docs.",
  },
];

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolved key -> value map, DB value where set, the def's default otherwise. What the public landing page actually renders. */
  async getPublicSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    return Object.fromEntries(SITE_SETTING_DEFS.map((def) => [def.key, byKey.get(def.key) ?? def.default]));
  }

  /** Full editable list for the admin Settings page — label/description so the form can render itself. */
  async listForAdmin() {
    const rows = await this.prisma.siteSetting.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return SITE_SETTING_DEFS.map((def) => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        value: row?.value ?? def.default,
        updatedAt: row?.updatedAt.toISOString() ?? null,
      };
    });
  }

  /** Silently drops any key outside the whitelist — the loophole this closes is a caller writing an arbitrary key this table was never meant to hold. */
  async updateSettings(updates: Record<string, string>, actorAdminId: string): Promise<void> {
    const validKeys = new Set(SITE_SETTING_DEFS.map((def) => def.key));
    const entries = Object.entries(updates).filter(([key]) => validKeys.has(key));

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.siteSetting.upsert({
          where: { key },
          update: { value, updatedBy: actorAdminId },
          create: { key, value, updatedBy: actorAdminId },
        }),
      ),
    );
  }
}
