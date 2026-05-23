import { z } from "zod";
import { ToolIdSchema } from "../ids.js";

export const ToolParamSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(512),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  required: z.boolean().default(false),
});
export type ToolParam = z.infer<typeof ToolParamSchema>;

const ToolBase = z.object({
  id: ToolIdSchema,
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "Use snake_case identifier (e.g. lookup_customer)"),
  description: z.string().min(1).max(1_000),
  enabled: z.boolean().default(true),
  params: z.array(ToolParamSchema).default([]),
  updatedAt: z.string().datetime().optional(),
});

export const HttpToolSchema = ToolBase.extend({
  type: z.literal("http"),
  http: z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).default({}),
    /** Optional Secrets Manager ARN for an auth header value injected at call time. */
    authSecretArn: z.string().optional(),
    /** Body template referencing tool params via {{paramName}}. */
    bodyTemplate: z.string().optional(),
  }),
});
export type HttpTool = z.infer<typeof HttpToolSchema>;

export const FeelToolSchema = ToolBase.extend({
  type: z.literal("feel"),
  feel: z.object({
    /** FEEL expression evaluated by Camunda as the tool result. */
    expression: z.string().min(1),
  }),
});
export type FeelTool = z.infer<typeof FeelToolSchema>;

export const ToolSchema = z.discriminatedUnion("type", [HttpToolSchema, FeelToolSchema]);
export type Tool = z.infer<typeof ToolSchema>;

export const ToolTypes = ["http", "feel"] as const;
