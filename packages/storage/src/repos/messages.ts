import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  ThreadMessageSchema,
  type AgentStep,
  type Email,
  type TenantId,
  type ThreadId,
  type ThreadMessage,
} from "@camunda-email-agent/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const messagesRepo = {
  async appendEmail(tenantId: TenantId, email: Email): Promise<void> {
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: {
          PK: PK(tenantId),
          SK: SK.message(email.threadId, email.receivedAt, email.id),
          data: { kind: "email", email },
        },
      }),
    );
  },

  async appendAgentStep(tenantId: TenantId, step: AgentStep): Promise<void> {
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: {
          PK: PK(tenantId),
          SK: SK.message(step.threadId, step.ts, step.id),
          data: { kind: "agent", step },
        },
      }),
    );
  },

  async listForThread(
    tenantId: TenantId,
    threadId: ThreadId,
    limit = 200,
  ): Promise<ThreadMessage[]> {
    const res = await ddb().send(
      new QueryCommand({
        TableName: storageConfig.tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": PK(tenantId),
          ":sk": SK.messagePrefix(threadId),
        },
        Limit: limit,
      }),
    );
    return (res.Items ?? []).map((it) => ThreadMessageSchema.parse(it.data));
  },
};
