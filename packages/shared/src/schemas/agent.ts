import { z } from "zod";

export const AgentModelSchema = z.enum([
  "anthropic.claude-3-5-sonnet",
  "anthropic.claude-3-5-haiku",
  "anthropic.claude-3-opus",
  "openai.gpt-4o",
  "openai.gpt-4o-mini",
]);
export type AgentModel = z.infer<typeof AgentModelSchema>;

export const GuardrailSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(128),
  /** Free-text instruction the agent must follow (e.g. "Never share pricing details"). */
  instruction: z.string().min(1).max(2_000),
  enabled: z.boolean().default(true),
});
export type Guardrail = z.infer<typeof GuardrailSchema>;

export const AgentConfigSchema = z.object({
  /** System prompt rendered into the AI Agent connector task. */
  systemPrompt: z.string().min(1).max(20_000),
  /** Optional persona, tone, or signature for the agent. */
  persona: z.string().max(2_000).optional(),
  /** Hard rules; rendered as numbered constraints in the system prompt. */
  guardrails: z.array(GuardrailSchema).default([]),
  model: AgentModelSchema.default("anthropic.claude-3-5-sonnet"),
  temperature: z.number().min(0).max(2).default(0.2),
  /** Max steps the agent can take before forced stop. */
  maxIterations: z.number().int().min(1).max(50).default(10),
  /** Whether the agent is allowed to send a reply autonomously. */
  autoReply: z.boolean().default(true),
  updatedAt: z.string().datetime().optional(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  systemPrompt:
    "You are a helpful email assistant. Read the incoming email carefully, use your tools and knowledge base to find the right answer, and reply concisely and politely.",
  guardrails: [],
  model: "anthropic.claude-3-5-sonnet",
  temperature: 0.2,
  maxIterations: 10,
  autoReply: true,
};
