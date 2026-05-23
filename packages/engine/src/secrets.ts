import { camundaSecretName, type TenantId } from "@sable/shared";
import { camundaConfig } from "./config.js";

interface ConsoleTokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: ConsoleTokenCache | undefined;

async function consoleToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    audience: "api.cloud.camunda.io",
    client_id: camundaConfig.consoleClientId(),
    client_secret: camundaConfig.consoleClientSecret(),
  });
  const res = await fetch(camundaConfig.consoleOauthUrl(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Camunda Console OAuth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

/**
 * Push (create or update) a single Camunda cluster secret. Per-tenant secrets
 * are namespaced via {@link camundaSecretName}, e.g. `T_ACME_IMAP_PASS`.
 */
export async function upsertClusterSecret(
  tenantId: TenantId,
  key: string,
  value: string,
): Promise<void> {
  const name = camundaSecretName(tenantId, key);
  const token = await consoleToken();
  const url = `${camundaConfig.consoleBaseUrl()}/clusters/${camundaConfig.clusterId()}/secrets`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ secretName: name, secretValue: value }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to push secret ${name}: ${res.status} ${await res.text()}`);
  }
  if (res.status === 409) {
    // Already exists — update it.
    const updateUrl = `${url}/${encodeURIComponent(name)}`;
    const upd = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ secretValue: value }),
    });
    if (!upd.ok) {
      throw new Error(`Failed to update secret ${name}: ${upd.status} ${await upd.text()}`);
    }
  }
}

export async function upsertManyClusterSecrets(
  tenantId: TenantId,
  entries: Array<{ key: string; value: string }>,
): Promise<void> {
  for (const e of entries) {
    await upsertClusterSecret(tenantId, e.key, e.value);
  }
}
