import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { TenantIdSchema, type TenantId } from "@camunda-email-agent/shared";

/**
 * Extract the tenant ID from the Cognito JWT claims on an API Gateway v2 event.
 * The `sub` claim is treated as the tenant ID. We constrain the format so it
 * survives being used as a DynamoDB key and BPMN identifier.
 */
export function tenantFrom(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): TenantId {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  if (typeof sub !== "string") throw new Error("No sub claim in JWT");
  // Cognito sub is a UUID with hyphens — strip them so it matches our id regex.
  const compact = sub.replace(/-/g, "");
  return TenantIdSchema.parse(compact);
}

export function emailFromClaims(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): string | undefined {
  const v = event.requestContext.authorizer?.jwt?.claims?.email;
  return typeof v === "string" ? v : undefined;
}
