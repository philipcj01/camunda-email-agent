import { z } from "zod";
import { ThreadIdSchema } from "../ids.js";

export const EmailAddressSchema = z.object({
  address: z.string().email(),
  name: z.string().optional(),
});
export type EmailAddress = z.infer<typeof EmailAddressSchema>;

export const EmailDirectionSchema = z.enum(["inbound", "outbound"]);
export type EmailDirection = z.infer<typeof EmailDirectionSchema>;

export const EmailAttachmentSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  /** S3 key relative to the knowledge bucket (attachments path). */
  s3Key: z.string().optional(),
});
export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;

export const EmailSchema = z.object({
  id: z.string(),
  threadId: ThreadIdSchema,
  direction: EmailDirectionSchema,
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).default([]),
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema).default([]),
  cc: z.array(EmailAddressSchema).default([]),
  subject: z.string().default(""),
  textBody: z.string().default(""),
  htmlBody: z.string().optional(),
  attachments: z.array(EmailAttachmentSchema).default([]),
  receivedAt: z.string().datetime(),
});
export type Email = z.infer<typeof EmailSchema>;

export const AgentStepKindSchema = z.enum([
  "thought",
  "tool_call",
  "tool_result",
  "final_reply",
]);
export type AgentStepKind = z.infer<typeof AgentStepKindSchema>;

export const AgentStepSchema = z.object({
  id: z.string(),
  threadId: ThreadIdSchema,
  kind: AgentStepKindSchema,
  content: z.string(),
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolOutput: z.unknown().optional(),
  ts: z.string().datetime(),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;

export const ThreadMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("email"), email: EmailSchema }),
  z.object({ kind: z.literal("agent"), step: AgentStepSchema }),
]);
export type ThreadMessage = z.infer<typeof ThreadMessageSchema>;
