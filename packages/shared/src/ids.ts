import { z } from "zod";

export const TenantIdSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
export type TenantId = z.infer<typeof TenantIdSchema>;

export const ToolIdSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
export type ToolId = z.infer<typeof ToolIdSchema>;

export const ThreadIdSchema = z.string().min(1).max(128);
export type ThreadId = z.infer<typeof ThreadIdSchema>;

export const KnowledgeIdSchema = z.string().min(1).max(64);
export type KnowledgeId = z.infer<typeof KnowledgeIdSchema>;

/**
 * Process ID namespacing fallback when the Camunda cluster plan does not
 * support native multi-tenancy.
 */
export const processIdForTenant = (tenantId: TenantId): string =>
  `sable--${tenantId}`;

/**
 * Camunda secret name convention: per-tenant secrets are prefixed so we can
 * scope them and reference them deterministically from generated BPMN.
 */
export const camundaSecretName = (tenantId: TenantId, key: string): string =>
  `T_${tenantId.toUpperCase().replace(/-/g, "_")}_${key}`;
