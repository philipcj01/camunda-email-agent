import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import { AgentConfigSchema } from "@camunda-email-agent/shared";
import { agentConfigRepo } from "@camunda-email-agent/storage";
import { tenantFrom } from "../lib/auth.js";
import { parseBody } from "../lib/parse.js";
import { badRequest, ok, serverError } from "../lib/response.js";

export const get: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const cfg = await agentConfigRepo.get(tenantId);
    return ok(cfg);
  } catch (err) {
    return serverError(err);
  }
};

export const put: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const cfg = parseBody(event, AgentConfigSchema);
    const saved = await agentConfigRepo.put(tenantId, cfg);
    return ok(saved);
  } catch (err) {
    if (err instanceof Error && err.message.includes("parse")) return badRequest(err.message);
    return serverError(err);
  }
};
