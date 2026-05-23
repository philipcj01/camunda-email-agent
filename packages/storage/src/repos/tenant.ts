import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  TenantProfileSchema,
  type TenantId,
  type TenantProfile,
} from "@sable/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const tenantRepo = {
  async get(tenantId: TenantId): Promise<TenantProfile | null> {
    const res = await ddb().send(
      new GetCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.profile() },
      }),
    );
    if (!res.Item) return null;
    return TenantProfileSchema.parse(res.Item.data);
  },

  async upsert(profile: TenantProfile): Promise<TenantProfile> {
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: { PK: PK(profile.tenantId), SK: SK.profile(), data: profile },
      }),
    );
    return profile;
  },
};
