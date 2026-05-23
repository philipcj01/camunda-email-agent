import type { TenantId, ToolId, ThreadId, KnowledgeId } from "@camunda-email-agent/shared";

export const PK = (tenantId: TenantId) => `TENANT#${tenantId}`;

export const SK = {
  profile: () => "PROFILE",
  agentConfig: () => "AGENT_CFG",
  emailConfig: () => "EMAIL_CFG",
  tool: (toolId: ToolId) => `TOOL#${toolId}`,
  toolPrefix: () => "TOOL#",
  deployment: (version: number) => `DEPLOYMENT#${String(version).padStart(10, "0")}`,
  deploymentPrefix: () => "DEPLOYMENT#",
  thread: (threadId: ThreadId) => `THREAD#${threadId}`,
  threadPrefix: () => "THREAD#",
  message: (threadId: ThreadId, ts: string, id: string) => `MSG#${threadId}#${ts}#${id}`,
  messagePrefix: (threadId: ThreadId) => `MSG#${threadId}#`,
  knowledge: (id: KnowledgeId) => `KNOWLEDGE#${id}`,
  knowledgePrefix: () => "KNOWLEDGE#",
};

export const GSI1 = {
  inboxPK: (tenantId: TenantId) => `TENANT#${tenantId}#INBOX`,
  /** Sort key sorts threads by lastMessageAt descending (lexicographic reverse). */
  inboxSK: (lastMessageAt: string, threadId: ThreadId) =>
    `${lastMessageAt}#${threadId}`,
};
