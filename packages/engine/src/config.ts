function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const camundaConfig = {
  clusterId: () => required("CAMUNDA_CLUSTER_ID"),
  clusterRegion: () => process.env.CAMUNDA_CLUSTER_REGION ?? "bru-2",
  clientId: () => required("CAMUNDA_CLIENT_ID"),
  clientSecret: () => required("CAMUNDA_CLIENT_SECRET"),
  oauthUrl: () =>
    process.env.CAMUNDA_OAUTH_URL ?? "https://login.cloud.camunda.io/oauth/token",
  consoleClientId: () => required("CAMUNDA_CONSOLE_CLIENT_ID"),
  consoleClientSecret: () => required("CAMUNDA_CONSOLE_CLIENT_SECRET"),
  consoleOauthUrl: () =>
    process.env.CAMUNDA_CONSOLE_OAUTH_URL ?? "https://login.cloud.camunda.io/oauth/token",
  consoleBaseUrl: () =>
    process.env.CAMUNDA_CONSOLE_BASE_URL ?? "https://api.cloud.camunda.io",
};
