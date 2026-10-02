import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundApiException } from "../common/exceptions/api.exception";
import type { SubmitContactInput } from "./contact.validation";

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(input: SubmitContactInput) {
    const submission = await this.prisma.contactSubmission.create({ data: input });
    return { id: submission.id, createdAt: submission.createdAt.toISOString() };
  }

  /** The admin platform's only way to see what's been submitted — nothing here is a write-only void. */
  async listForAdmin() {
    const submissions = await this.prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });
    return submissions.map((submission) => ({
      ...submission,
      createdAt: submission.createdAt.toISOString(),
      respondedAt: submission.respondedAt?.toISOString() ?? null,
    }));
  }

  /**
   * Records a response and marks the submission RESPONDED. There's no
   * outbound-email delivery here — no SMTP/email-provider credentials exist
   * in this project — so this is a real, persisted reply an admin can read
   * back, not a sent email.
   */
  async respond(id: string, response: string) {
    const existing = await this.prisma.contactSubmission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundApiException("Contact submission not found", "CONTACT_SUBMISSION_NOT_FOUND");

    const updated = await this.prisma.contactSubmission.update({
      where: { id },
      data: { adminResponse: response, respondedAt: new Date(), status: "RESPONDED" },
    });

    return { ...updated, createdAt: updated.createdAt.toISOString(), respondedAt: updated.respondedAt!.toISOString() };
  }

  async countUnresponded(): Promise<number> {
    return this.prisma.contactSubmission.count({ where: { status: "NEW" } });
  }
}
