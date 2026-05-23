import { Camunda8 } from "@camunda8/sdk";
import { camundaConfig } from "./config.js";

let _camunda: Camunda8 | undefined;

export function camunda(): Camunda8 {
  if (!_camunda) {
    _camunda = new Camunda8({
      ZEEBE_ADDRESS: `${camundaConfig.clusterId()}.${camundaConfig.clusterRegion()}.zeebe.camunda.io:443`,
      ZEEBE_CLIENT_ID: camundaConfig.clientId(),
      ZEEBE_CLIENT_SECRET: camundaConfig.clientSecret(),
      CAMUNDA_OAUTH_URL: camundaConfig.oauthUrl(),
      CAMUNDA_CONSOLE_OAUTH_AUDIENCE: "api.cloud.camunda.io",
      CAMUNDA_CONSOLE_BASE_URL: camundaConfig.consoleBaseUrl(),
      CAMUNDA_CONSOLE_CLIENT_ID: camundaConfig.consoleClientId(),
      CAMUNDA_CONSOLE_CLIENT_SECRET: camundaConfig.consoleClientSecret(),
      CAMUNDA_AUTH_STRATEGY: "OAUTH",
    });
  }
  return _camunda;
}
