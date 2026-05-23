import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  EmailConfigSchema,
  type EmailConfig,
  type TenantId,
} from "@camunda-email-agent/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const emailConfigRepo = {
  async get(tenantId: TenantId): Promise<EmailConfig | null> {
    const res = await ddb().send(
      new GetCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.emailConfig() },
      }),
    );
    if (!res.Item) return null;
    return EmailConfigSchema.parse(res.Item.data);
  },

  async put(tenantId: TenantId, config: EmailConfig): Promise<EmailConfig> {
    const data: EmailConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: { PK: PK(tenantId), SK: SK.emailConfig(), data },
      }),
    );
    return data;
  },
};
