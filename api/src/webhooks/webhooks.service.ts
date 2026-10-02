import { Injectable, Logger } from "@nestjs/common";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundApiException } from "../common/exceptions/api.exception";
import type { SetWebhookEndpointInput } from "./webhooks.validation";

const DELIVERY_TIMEOUT_MS = 5000;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEndpoint(merchantId: string) {
    const endpoint = await this.prisma.merchantWebhookEndpoint.findUnique({ where: { merchantId } });
    if (!endpoint) throw new NotFoundApiException("No webhook endpoint registered", "WEBHOOK_ENDPOINT_NOT_FOUND");
    return this.toEndpoint(endpoint);
  }

  async setEndpoint(merchantId: string, input: SetWebhookEndpointInput) {
    const existing = await this.prisma.merchantWebhookEndpoint.findUnique({ where: { merchantId } });

    const endpoint = existing
      ? await this.prisma.merchantWebhookEndpoint.update({ where: { merchantId }, data: { url: input.url } })
      : await this.prisma.merchantWebhookEndpoint.create({ data: { merchantId, url: input.url, secret: this.generateSecret() } });

    return this.toEndpoint(endpoint);
  }

  async rotateSecret(merchantId: string) {
    const endpoint = await this.prisma.merchantWebhookEndpoint.findUnique({ where: { merchantId } });
    if (!endpoint) throw new NotFoundApiException("No webhook endpoint registered", "WEBHOOK_ENDPOINT_NOT_FOUND");

    const updated = await this.prisma.merchantWebhookEndpoint.update({
      where: { merchantId },
      data: { secret: this.generateSecret() },
    });
    return this.toEndpoint(updated);
  }

  async listEvents(merchantId: string) {
    const events = await this.prisma.webhookEvent.findMany({ where: { merchantId }, orderBy: { createdAt: "desc" } });
    return events.map((event) => this.toEvent(event));
  }

  async redeliver(merchantId: string, eventId: string) {
    const event = await this.prisma.webhookEvent.findUnique({ where: { id: eventId }, include: { endpoint: true } });
    if (!event || event.merchantId !== merchantId) throw new NotFoundApiException("Webhook event not found", "WEBHOOK_EVENT_NOT_FOUND");

    const { responseStatus, delivered } = await this.deliver(event.endpoint.url, event.endpoint.secret, event.id, event.eventType, event.payload, event.createdAt);

    const updated = await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        status: delivered ? "DELIVERED" : "FAILED",
        responseStatus,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
    return this.toEvent(updated);
  }

  /**
   * Fires an event for a merchant, if they've registered an endpoint — a
   * no-op otherwise (most merchants during development haven't set one up,
   * and that's not an error). Never throws: a webhook delivery failure must
   * never fail the financial operation that triggered it — the event is
   * just logged as FAILED for the merchant to see and redeliver.
   */
  async fireEvent(merchantId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const endpoint = await this.prisma.merchantWebhookEndpoint.findUnique({ where: { merchantId } });
    if (!endpoint) return;

    const eventId = randomUUID();
    const createdAt = new Date();

    const { responseStatus, delivered } = await this.deliver(endpoint.url, endpoint.secret, eventId, eventType, payload, createdAt).catch((error) => {
      this.logger.warn(`Webhook delivery threw for merchant ${merchantId}: ${error instanceof Error ? error.message : String(error)}`);
      return { responseStatus: undefined, delivered: false };
    });

    await this.prisma.webhookEvent.create({
      data: {
        id: eventId,
        merchantId,
        endpointId: endpoint.id,
        eventType,
        payload: payload as unknown as Prisma.InputJsonValue,
        status: delivered ? "DELIVERED" : "FAILED",
        responseStatus,
        createdAt,
        lastAttemptAt: new Date(),
      },
    });
  }

  /** Builds the exact signed body and POSTs it — shared by first delivery and redelivery so a redelivered event is byte-identical (same id/createdAt), which is what makes merchant-side idempotent processing by event id actually work. */
  private async deliver(
    url: string,
    secret: string,
    eventId: string,
    eventType: string,
    payload: unknown,
    createdAt: Date,
  ): Promise<{ responseStatus?: number; delivered: boolean }> {
    const body = JSON.stringify({ id: eventId, type: eventType, data: payload, createdAt: createdAt.toISOString() });
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sapok-Signature": signature, "X-Sapok-Event-Id": eventId },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      return { responseStatus: response.status, delivered: response.ok };
    } catch {
      return { delivered: false };
    }
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(24).toString("hex")}`;
  }

  private toEndpoint(endpoint: { id: string; merchantId: string; url: string; secret: string; createdAt: Date; updatedAt: Date }) {
    return {
      id: endpoint.id,
      merchantId: endpoint.merchantId,
      url: endpoint.url,
      secret: endpoint.secret,
      createdAt: endpoint.createdAt.toISOString(),
      updatedAt: endpoint.updatedAt.toISOString(),
    };
  }

  private toEvent(event: {
    id: string;
    merchantId: string;
    endpointId: string;
    eventType: string;
    payload: unknown;
    status: string;
    responseStatus: number | null;
    attempts: number;
    createdAt: Date;
    lastAttemptAt: Date;
  }) {
    return {
      id: event.id,
      merchantId: event.merchantId,
      endpointId: event.endpointId,
      eventType: event.eventType,
      payload: event.payload,
      status: event.status,
      responseStatus: event.responseStatus,
      attempts: event.attempts,
      createdAt: event.createdAt.toISOString(),
      lastAttemptAt: event.lastAttemptAt.toISOString(),
    };
  }
}
