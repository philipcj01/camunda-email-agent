import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  ThreadSchema,
  type TenantId,
  type Thread,
  type ThreadId,
} from "@sable/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { GSI1, PK, SK } from "../keys.js";

/**
 * For DESC sort of lastMessageAt on GSI1, we store the *inverse* timestamp
 * as the sort-key prefix so a forward index scan yields newest-first.
 */
const inverseTs = (iso: string): string => {
  const ms = Date.parse(iso);
  return String(8640000000000000 - ms).padStart(16, "0");
};

export const threadsRepo = {
  async get(tenantId: TenantId, threadId: ThreadId): Promise<Thread | null> {
    const res = await ddb().send(
      new GetCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.thread(threadId) },
      }),
    );
    if (!res.Item) return null;
    return ThreadSchema.parse(res.Item.data);
  },

  async upsert(tenantId: TenantId, thread: Thread): Promise<Thread> {
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: {
          PK: PK(tenantId),
          SK: SK.thread(thread.threadId),
          GSI1PK: GSI1.inboxPK(tenantId),
          GSI1SK: `${inverseTs(thread.lastMessageAt)}#${thread.threadId}`,
          data: thread,
        },
      }),
    );
    return thread;
  },

  async listInbox(
    tenantId: TenantId,
    opts?: { limit?: number; cursor?: string },
  ): Promise<{ items: Thread[]; cursor?: string }> {
    const res = await ddb().send(
      new QueryCommand({
        TableName: storageConfig.tableName(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": GSI1.inboxPK(tenantId) },
        Limit: opts?.limit ?? 25,
        ExclusiveStartKey: opts?.cursor
          ? (JSON.parse(Buffer.from(opts.cursor, "base64").toString()) as Record<string, unknown>)
          : undefined,
      }),
    );
    const items = (res.Items ?? []).map((it) => ThreadSchema.parse(it.data));
    const cursor = res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString("base64")
      : undefined;
    return { items, cursor };
  },

  async setStatus(
    tenantId: TenantId,
    threadId: ThreadId,
    status: Thread["status"],
  ): Promise<void> {
    await ddb().send(
      new UpdateCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.thread(threadId) },
        UpdateExpression: "SET #data.#status = :s",
        ExpressionAttributeNames: { "#data": "data", "#status": "status" },
        ExpressionAttributeValues: { ":s": status },
      }),
    );
  },
};
