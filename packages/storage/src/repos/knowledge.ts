import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  KnowledgeDocSchema,
  type KnowledgeDoc,
  type KnowledgeId,
  type KnowledgeSyncStatus,
  type TenantId,
} from "@sable/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const knowledgeRepo = {
  async list(tenantId: TenantId): Promise<KnowledgeDoc[]> {
    const res = await ddb().send(
      new QueryCommand({
        TableName: storageConfig.tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": PK(tenantId),
          ":sk": SK.knowledgePrefix(),
        },
      }),
    );
    return (res.Items ?? []).map((it) => KnowledgeDocSchema.parse(it.data));
  },

  async get(tenantId: TenantId, id: KnowledgeId): Promise<KnowledgeDoc | null> {
    const res = await ddb().send(
      new GetCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.knowledge(id) },
      }),
    );
    if (!res.Item) return null;
    return KnowledgeDocSchema.parse(res.Item.data);
  },

  async put(tenantId: TenantId, doc: KnowledgeDoc): Promise<KnowledgeDoc> {
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: { PK: PK(tenantId), SK: SK.knowledge(doc.id), data: doc },
      }),
    );
    return doc;
  },

  async updateSyncStatus(
    tenantId: TenantId,
    id: KnowledgeId,
    status: KnowledgeSyncStatus,
    error?: string,
  ): Promise<void> {
    const set = ["#data.syncStatus = :status"];
    const exprValues: Record<string, unknown> = { ":status": status };
    if (status === "ready") {
      set.push("#data.syncedAt = :syncedAt");
      exprValues[":syncedAt"] = new Date().toISOString();
    }
    if (error !== undefined) {
      set.push("#data.syncError = :err");
      exprValues[":err"] = error;
    }
    await ddb().send(
      new UpdateCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.knowledge(id) },
        UpdateExpression: `SET ${set.join(", ")}`,
        ExpressionAttributeNames: { "#data": "data" },
        ExpressionAttributeValues: exprValues,
      }),
    );
  },

  async delete(tenantId: TenantId, id: KnowledgeId): Promise<void> {
    await ddb().send(
      new DeleteCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.knowledge(id) },
      }),
    );
  },
};
