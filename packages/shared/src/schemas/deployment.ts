import { z } from "zod";

export const DeploymentStatusSchema = z.enum([
  "pending",
  "deploying",
  "deployed",
  "failed",
]);
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const DeploymentRecordSchema = z.object({
  version: z.number().int().positive(),
  bpmnHash: z.string(),
  /** Camunda's returned deployment key after a successful deploy. */
  camundaDeploymentKey: z.string().optional(),
  processDefinitionKey: z.string().optional(),
  processId: z.string(),
  status: DeploymentStatusSchema,
  error: z.string().optional(),
  deployedBy: z.string(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type DeploymentRecord = z.infer<typeof DeploymentRecordSchema>;

export const DeployPreviewSchema = z.object({
  /** Next version number that will be assigned. */
  nextVersion: z.number().int().positive(),
  bpmnXml: z.string(),
  bpmnHash: z.string(),
  previousBpmnHash: z.string().optional(),
  hasChanges: z.boolean(),
  /** Unified-diff string between previous and next BPMN, empty when first deploy. */
  diff: z.string(),
});
export type DeployPreview = z.infer<typeof DeployPreviewSchema>;
