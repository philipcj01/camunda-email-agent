import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ToolSchema,
  type TenantId,
  type Tool,
  type ToolId,
} from "@camunda-email-agent/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const toolsRepo = {
  async list(tenantId: TenantId): Promise<Tool[]> {
    const res = await ddb().send(
      new QueryCommand({
        TableName: storageConfig.tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": PK(tenantId),
          ":sk": SK.toolPrefix(),
        },
      }),
    );
    return (res.Items ?? []).map((it) => ToolSchema.parse(it.data));
  },

  async get(tenantId: TenantId, toolId: ToolId): Promise<Tool | null> {
    const res = await ddb().send(
      new GetCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.tool(toolId) },
      }),
    );
    if (!res.Item) return null;
    return ToolSchema.parse(res.Item.data);
  },

  async put(tenantId: TenantId, tool: Tool): Promise<Tool> {
    const data: Tool = { ...tool, updatedAt: new Date().toISOString() };
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: { PK: PK(tenantId), SK: SK.tool(tool.id), data },
      }),
    );
    return data;
  },

  async delete(tenantId: TenantId, toolId: ToolId): Promise<void> {
    await ddb().send(
      new DeleteCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.tool(toolId) },
      }),
    );
  },
};
