import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import {
  type DeployPreview,
  type DeploymentRecord,
  processIdForTenant,
} from "@camunda-email-agent/shared";
import {
  agentConfigRepo,
  deploymentsRepo,
  emailConfigRepo,
  secretsHelpers,
  toolsRepo,
} from "@camunda-email-agent/storage";
import { generateBpmn, unifiedDiff } from "@camunda-email-agent/bpmn-generator";
import { deployBpmn, upsertManyClusterSecrets } from "@camunda-email-agent/camunda-client";
import { tenantFrom, emailFromClaims } from "../lib/auth.js";
import { badRequest, ok, serverError } from "../lib/response.js";

const apiBaseUrl = () => process.env.APP_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function buildBpmnFor(tenantId: string) {
  const [agentConfig, emailConfig, tools] = await Promise.all([
    agentConfigRepo.get(tenantId),
    emailConfigRepo.get(tenantId),
    toolsRepo.list(tenantId),
  ]);
  if (!emailConfig) {
    throw new Error("Email connector is not configured yet — please complete the Email page first");
  }
  return generateBpmn({ tenantId, agentConfig, emailConfig, tools, apiBaseUrl: apiBaseUrl() });
}

export const preview: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const gen = await buildBpmnFor(tenantId);
    const latest = await deploymentsRepo.latest(tenantId);
    const previousHash = latest?.bpmnHash;
    const previousXml = ""; // BPMN bodies aren't stored back; the diff displays vs empty for first deploy.
    const hasChanges = previousHash !== gen.hash;
    const result: DeployPreview = {
      nextVersion: (latest?.version ?? 0) + 1,
      bpmnXml: gen.xml,
      bpmnHash: gen.hash,
      previousBpmnHash: previousHash,
      hasChanges,
      diff: hasChanges ? unifiedDiff(previousXml, gen.xml) : "",
    };
    return ok(result);
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return serverError(err);
  }
};

export const deploy: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const actor = emailFromClaims(event as APIGatewayProxyEventV2WithJWTAuthorizer) ?? tenantId;
    const gen = await buildBpmnFor(tenantId);
    const latest = await deploymentsRepo.latest(tenantId);
    const version = (latest?.version ?? 0) + 1;
    const processId = processIdForTenant(tenantId);

    const record: DeploymentRecord = {
      version,
      bpmnHash: gen.hash,
      processId,
      status: "deploying",
      deployedBy: actor,
      createdAt: new Date().toISOString(),
    };
    await deploymentsRepo.create(tenantId, record);

    try {
      // 1. Resolve per-tenant secrets (IMAP/SMTP passwords) and push them to Camunda
      //    cluster secrets so the BPMN's {{secrets.T_<TENANT>_*}} references resolve.
      const resolvedSecrets = await Promise.all(
        gen.secretsToProvision.map(async (s) => ({
          key: s.key,
          value: await secretsHelpers.getString(s.sourceSecretArn),
        })),
      );
      // Also push the per-tenant HMAC secret so generated service tasks can sign
      // outbound webhook calls back to our API.
      resolvedSecrets.push({
        key: "WEBHOOK_HMAC",
        value: process.env.WEBHOOK_SIGNING_SECRET ?? "",
      });
      await upsertManyClusterSecrets(tenantId, resolvedSecrets);

      // 2. Deploy BPMN.
      const result = await deployBpmn(tenantId, gen.xml);

      await deploymentsRepo.update(tenantId, version, {
        status: "deployed",
        camundaDeploymentKey: result.deploymentKey,
        processDefinitionKey: result.processDefinitionKey,
        completedAt: new Date().toISOString(),
      });

      return ok({ ...record, status: "deployed", camundaDeploymentKey: result.deploymentKey });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await deploymentsRepo.markStatus(tenantId, version, "failed", msg);
      throw err;
    }
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return serverError(err);
  }
};

export const listDeployments: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    return ok(await deploymentsRepo.list(tenantId));
  } catch (err) {
    return serverError(err);
  }
};
