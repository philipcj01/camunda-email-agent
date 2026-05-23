import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  EmailCompletedWebhookSchema,
  EmailReceivedWebhookSchema,
  type Email,
  type Thread,
} from "@camunda-email-agent/shared";
import { messagesRepo, threadsRepo } from "@camunda-email-agent/storage";
import { rawBody } from "../lib/parse.js";
import { badRequest, ok, serverError, unauthorized } from "../lib/response.js";
import {
  readWebhookHeaders,
  verifyWebhook,
  WebhookAuthError,
} from "../lib/webhook-hmac.js";

function deriveThreadId(p: {
  inReplyTo?: string;
  references: string[];
  subject: string;
  messageId: string;
}): string {
  if (p.references[0]) return p.references[0];
  if (p.inReplyTo) return p.inReplyTo;
  // Fall back to subject-normalized thread id, then to the messageId itself.
  const norm = p.subject.replace(/^(re:|fwd?:)\s*/i, "").trim().toLowerCase();
  return norm ? `subject:${norm}` : p.messageId;
}

function verifyOrThrow(event: APIGatewayProxyEventV2) {
  const hdr = readWebhookHeaders(event.headers as Record<string, string | undefined>);
  verifyWebhook(rawBody(event), hdr);
  return hdr;
}

export const emailReceived: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const hdr = verifyOrThrow(event);
    const payload = EmailReceivedWebhookSchema.parse(
      JSON.parse(rawBody(event)),
    );
    if (payload.tenantId !== hdr.tenantId) return unauthorized("tenant mismatch");

    const threadId = payload.threadId ?? deriveThreadId(payload);
    const now = payload.receivedAt;

    const email: Email = {
      id: randomUUID(),
      threadId,
      direction: "inbound",
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      from: payload.from,
      to: payload.to,
      cc: payload.cc,
      subject: payload.subject,
      textBody: payload.textBody,
      htmlBody: payload.htmlBody,
      attachments: payload.attachments,
      receivedAt: now,
    };

    const existing = await threadsRepo.get(payload.tenantId, threadId);
    const thread: Thread = {
      threadId,
      subject: existing?.subject ?? payload.subject,
      participants: existing?.participants ?? [payload.from, ...payload.to, ...payload.cc],
      lastMessageAt: now,
      lastInboundAt: now,
      lastOutboundAt: existing?.lastOutboundAt,
      messageCount: (existing?.messageCount ?? 0) + 1,
      status: "awaiting_agent",
      processInstanceKey: payload.processInstanceKey,
    };

    await threadsRepo.upsert(payload.tenantId, thread);
    await messagesRepo.appendEmail(payload.tenantId, email);

    return ok({ threadId, emailId: email.id });
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    if (err instanceof Error && err.name === "ZodError") return badRequest(err.message);
    return serverError(err);
  }
};

export const emailCompleted: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const hdr = verifyOrThrow(event);
    const payload = EmailCompletedWebhookSchema.parse(JSON.parse(rawBody(event)));
    if (payload.tenantId !== hdr.tenantId) return unauthorized("tenant mismatch");

    for (const step of payload.steps) {
      await messagesRepo.appendAgentStep(payload.tenantId, step);
    }

    if (payload.outbound) {
      const sent: Email = {
        id: randomUUID(),
        threadId: payload.threadId,
        direction: "outbound",
        messageId: payload.outbound.messageId,
        from: { address: "agent@local" },
        to: [],
        cc: [],
        subject: payload.outbound.subject,
        textBody: payload.outbound.textBody,
        htmlBody: payload.outbound.htmlBody,
        attachments: [],
        references: [],
        receivedAt: payload.outbound.sentAt,
      };
      await messagesRepo.appendEmail(payload.tenantId, sent);
    }

    const existing = await threadsRepo.get(payload.tenantId, payload.threadId);
    if (existing) {
      const now = new Date().toISOString();
      await threadsRepo.upsert(payload.tenantId, {
        ...existing,
        lastMessageAt: now,
        lastOutboundAt: payload.outbound ? now : existing.lastOutboundAt,
        messageCount: existing.messageCount + (payload.outbound ? 1 : 0),
        status: payload.outbound ? "replied" : "open",
      });
    }

    return ok({ ok: true });
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    if (err instanceof Error && err.name === "ZodError") return badRequest(err.message);
    return serverError(err);
  }
};
