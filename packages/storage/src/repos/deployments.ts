import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  DeploymentRecordSchema,
  type DeploymentRecord,
  type DeploymentStatus,
  type TenantId,
} from "@sable/shared";
import { ddb } from "../clients.js";
import { storageConfig } from "../config.js";
import { PK, SK } from "../keys.js";

export const deploymentsRepo = {
  async list(tenantId: TenantId, limit = 25): Promise<DeploymentRecord[]> {
    const res = await ddb().send(
      new QueryCommand({
        TableName: storageConfig.tableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": PK(tenantId),
          ":sk": SK.deploymentPrefix(),
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (res.Items ?? []).map((it) => DeploymentRecordSchema.parse(it.data));
  },

  async latest(tenantId: TenantId): Promise<DeploymentRecord | null> {
    const items = await this.list(tenantId, 1);
    return items[0] ?? null;
  },

  async create(tenantId: TenantId, record: DeploymentRecord): Promise<DeploymentRecord> {
    await ddb().send(
      new PutCommand({
        TableName: storageConfig.tableName(),
        Item: { PK: PK(tenantId), SK: SK.deployment(record.version), data: record },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    return record;
  },

  async update(
    tenantId: TenantId,
    version: number,
    patch: Partial<Pick<DeploymentRecord,
      "status" | "camundaDeploymentKey" | "processDefinitionKey" | "error" | "completedAt"
    >>,
  ): Promise<void> {
    const setExpr: string[] = [];
    const names: Record<string, string> = { "#data": "data" };
    const values: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      setExpr.push(`#data.#${k} = :${k}`);
      names[`#${k}`] = k;
      values[`:${k}`] = v;
    }
    if (setExpr.length === 0) return;
    await ddb().send(
      new UpdateCommand({
        TableName: storageConfig.tableName(),
        Key: { PK: PK(tenantId), SK: SK.deployment(version) },
        UpdateExpression: `SET ${setExpr.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
  },

  async markStatus(
    tenantId: TenantId,
    version: number,
    status: DeploymentStatus,
    error?: string,
  ): Promise<void> {
    await this.update(tenantId, version, {
      status,
      error,
      completedAt: status === "deployed" || status === "failed" ? new Date().toISOString() : undefined,
    });
  },
};
