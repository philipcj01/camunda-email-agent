import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import { tenantRepo } from "@camunda-email-agent/storage";
import { emailFromClaims, tenantFrom } from "../lib/auth.js";
import { ok, serverError } from "../lib/response.js";

export const get: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const e = event as APIGatewayProxyEventV2WithJWTAuthorizer;
    const tenantId = tenantFrom(e);
    let profile = await tenantRepo.get(tenantId);
    if (!profile) {
      profile = await tenantRepo.upsert({
        tenantId,
        displayName: emailFromClaims(e)?.split("@")[0] ?? tenantId,
        email: emailFromClaims(e) ?? `${tenantId}@unknown`,
        createdAt: new Date().toISOString(),
        plan: "free",
      });
    }
    return ok(profile);
  } catch (err) {
    return serverError(err);
  }
};
