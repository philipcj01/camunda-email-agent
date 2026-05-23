import { z } from "zod";

export const ImapConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(993),
  secure: z.boolean().default(true),
  username: z.string().min(1),
  /** ARN of the Secrets Manager secret holding the password. */
  passwordSecretArn: z.string().min(1),
  folder: z.string().default("INBOX"),
  /** Poll interval in seconds. */
  pollIntervalSeconds: z.number().int().min(30).max(3_600).default(60),
});
export type ImapConfig = z.infer<typeof ImapConfigSchema>;

export const SmtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  username: z.string().min(1),
  passwordSecretArn: z.string().min(1),
  fromAddress: z.string().email(),
  fromName: z.string().min(1).max(128).optional(),
});
export type SmtpConfig = z.infer<typeof SmtpConfigSchema>;

export const EmailConfigSchema = z.object({
  inbound: ImapConfigSchema,
  outbound: SmtpConfigSchema,
  updatedAt: z.string().datetime().optional(),
});
export type EmailConfig = z.infer<typeof EmailConfigSchema>;

/**
 * What the frontend sends when editing email config — passwords come as raw
 * strings (over TLS); the API writes them to Secrets Manager and stores the
 * resulting ARN.
 */
export const EmailConfigInputSchema = z.object({
  inbound: ImapConfigSchema.omit({ passwordSecretArn: true }).extend({
    password: z.string().min(1).optional(),
  }),
  outbound: SmtpConfigSchema.omit({ passwordSecretArn: true }).extend({
    password: z.string().min(1).optional(),
  }),
});
export type EmailConfigInput = z.infer<typeof EmailConfigInputSchema>;
