import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
    return submissions.map((submission) => ({ ...submission, createdAt: submission.createdAt.toISOString() }));
  }
}
