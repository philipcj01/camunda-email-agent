import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  ResourceExistsException,
} from "@aws-sdk/client-secrets-manager";
import type { TenantId } from "@sable/shared";
import { secretsManager } from "./clients.js";
import { storageConfig } from "./config.js";

export const secretName = (tenantId: TenantId, key: string) =>
  `${storageConfig.secretsPrefix()}/${tenantId}/${key}`;

export const secretsHelpers = {
  /**
   * Idempotently create-or-update a string secret for the tenant. Returns the
   * full ARN so DynamoDB only ever stores ARNs (never raw passwords).
   */
  async upsertString(tenantId: TenantId, key: string, value: string): Promise<string> {
    const name = secretName(tenantId, key);
    try {
      const res = await secretsManager().send(
        new CreateSecretCommand({
          Name: name,
          SecretString: value,
          Description: `Email-agent secret for tenant ${tenantId}`,
        }),
      );
      if (!res.ARN) throw new Error("Secrets Manager returned no ARN");
      return res.ARN;
    } catch (err) {
      if (err instanceof ResourceExistsException) {
        const updated = await secretsManager().send(
          new PutSecretValueCommand({ SecretId: name, SecretString: value }),
        );
        if (!updated.ARN) throw new Error("Secrets Manager returned no ARN on update");
        return updated.ARN;
      }
      throw err;
    }
  },

  async getString(arnOrName: string): Promise<string> {
    const res = await secretsManager().send(
      new GetSecretValueCommand({ SecretId: arnOrName }),
    );
    if (!res.SecretString) throw new Error("Secret has no string value");
    return res.SecretString;
  },

  async delete(arnOrName: string): Promise<void> {
    await secretsManager().send(
      new DeleteSecretCommand({ SecretId: arnOrName, ForceDeleteWithoutRecovery: true }),
    );
  },
};
