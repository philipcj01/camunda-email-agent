import { z } from "zod";
import { ThreadIdSchema } from "../ids.js";
import { EmailAddressSchema } from "./email.js";

export const ThreadStatusSchema = z.enum(["open", "awaiting_agent", "replied", "closed"]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

export const ThreadSchema = z.object({
  threadId: ThreadIdSchema,
  subject: z.string().default(""),
  participants: z.array(EmailAddressSchema).default([]),
  lastMessageAt: z.string().datetime(),
  lastInboundAt: z.string().datetime().optional(),
  lastOutboundAt: z.string().datetime().optional(),
  messageCount: z.number().int().nonnegative().default(0),
  status: ThreadStatusSchema.default("open"),
  /** Camunda process instance key, when known. */
  processInstanceKey: z.string().optional(),
});
export type Thread = z.infer<typeof ThreadSchema>;
