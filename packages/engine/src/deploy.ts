import { processIdForTenant, type TenantId } from "@sable/shared";
import { camunda } from "./client.js";

export interface DeployResult {
  deploymentKey: string;
  processDefinitionKey: string;
  processId: string;
  version: number;
}

export async function deployBpmn(
  tenantId: TenantId,
  bpmnXml: string,
): Promise<DeployResult> {
  const processId = processIdForTenant(tenantId);
  const zeebe = camunda().getZeebeGrpcApiClient();

  const result = await zeebe.deployResource({
    name: `${processId}.bpmn`,
    process: Buffer.from(bpmnXml, "utf-8"),
  });

  const deployment = result.deployments?.[0]?.process;
  if (!deployment) {
    throw new Error(`Camunda returned no deployment for tenant ${tenantId}`);
  }

  return {
    deploymentKey: String(result.key),
    processDefinitionKey: String(deployment.processDefinitionKey),
    processId: deployment.bpmnProcessId,
    version: Number(deployment.version),
  };
}

export interface DeploymentSummary {
  processId: string;
  version: number;
  processDefinitionKey: string;
}

/**
 * Returns the most recent process definition deployed for this tenant.
 * Implemented via Operate API when available; returns null otherwise.
 */
export async function getLatestDeployment(
  tenantId: TenantId,
): Promise<DeploymentSummary | null> {
  const processId = processIdForTenant(tenantId);
  try {
    const operate = camunda().getOperateApiClient();
    const search = await operate.searchProcessDefinitions({
      filter: { bpmnProcessId: processId },
      sort: [{ field: "version", order: "DESC" }],
      size: 1,
    });
    const item = search.items?.[0];
    if (!item) return null;
    return {
      processId: item.bpmnProcessId,
      version: Number(item.version),
      processDefinitionKey: String(item.key),
    };
  } catch {
    return null;
  }
}
