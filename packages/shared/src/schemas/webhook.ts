import { z } from "zod";
import { TenantIdSchema, ThreadIdSchema } from "../ids.js";
import { EmailAddressSchema, EmailAttachmentSchema, AgentStepSchema } from "./email.js";

/**
 * Payload posted by the per-tenant BPMN service task immediately after an
 * email is received by the inbound connector.
 */
export const EmailReceivedWebhookSchema = z.object({
  tenantId: TenantIdSchema,
  processInstanceKey: z.string(),
  messageId: z.string(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).default([]),
  threadId: ThreadIdSchema.optional(),
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema).default([]),
  cc: z.array(EmailAddressSchema).default([]),
  subject: z.string().default(""),
  textBody: z.string().default(""),
  htmlBody: z.string().optional(),
  attachments: z.array(EmailAttachmentSchema).default([]),
  receivedAt: z.string().datetime(),
});
export type EmailReceivedWebhook = z.infer<typeof EmailReceivedWebhookSchema>;

/**
 * Payload posted at the end of the BPMN process with the agent's final reply
 * and the captured chat-history steps.
 */
export const EmailCompletedWebhookSchema = z.object({
  tenantId: TenantIdSchema,
  processInstanceKey: z.string(),
  threadId: ThreadIdSchema,
  steps: z.array(AgentStepSchema).default([]),
  outbound: z
    .object({
      messageId: z.string(),
      subject: z.string(),
      textBody: z.string(),
      htmlBody: z.string().optional(),
      sentAt: z.string().datetime(),
    })
    .optional(),
});
export type EmailCompletedWebhook = z.infer<typeof EmailCompletedWebhookSchema>;

/**
 * AI Agent tool-call payload — invoked by Camunda's AI Agent connector
 * against our `/tools/search-knowledge` endpoint.
 */
export const SearchKnowledgeRequestSchema = z.object({
  tenantId: TenantIdSchema,
  query: z.string().min(1).max(2_000),
  topK: z.number().int().min(1).max(20).default(5),
});
export type SearchKnowledgeRequest = z.infer<typeof SearchKnowledgeRequestSchema>;

export const SearchKnowledgeResponseSchema = z.object({
  results: z.array(
    z.object({
      content: z.string(),
      score: z.number(),
      source: z.string().optional(),
    }),
  ),
});
export type SearchKnowledgeResponse = z.infer<typeof SearchKnowledgeResponseSchema>;

export const WEBHOOK_HEADER_SIGNATURE = "x-sable-signature";
export const WEBHOOK_HEADER_TENANT = "x-sable-tenant-id";
export const WEBHOOK_HEADER_TIMESTAMP = "x-sable-timestamp";
