import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  AgentConfigSchema,
  DEFAULT_AGENT_CONFIG,
  type AgentConfig,
  type TenantId,
} from "@sable/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const agentConfigRepo = {
  async get(tenantId: TenantId): Promise<AgentConfig> {
    const res = await ddb().send(
      new GetCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.agentConfig() },
      }),
    );
    if (!res.Item) return DEFAULT_AGENT_CONFIG;
    return AgentConfigSchema.parse(res.Item.data);
  },

  async put(tenantId: TenantId, config: AgentConfig): Promise<AgentConfig> {
    const data: AgentConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: { PK: PK(tenantId), SK: SK.agentConfig(), data },
      }),
    );
    return data;
  },
};
