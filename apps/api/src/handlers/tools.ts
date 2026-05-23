import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import { ToolSchema, ToolIdSchema } from "@sable/shared";
import { toolsRepo } from "@sable/storage";
import { tenantFrom } from "../lib/auth.js";
import { parseBody } from "../lib/parse.js";
import { badRequest, noContent, notFound, ok, serverError } from "../lib/response.js";

export const list: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    return ok(await toolsRepo.list(tenantId));
  } catch (err) {
    return serverError(err);
  }
};

export const get: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const id = ToolIdSchema.parse(event.pathParameters?.id);
    const tool = await toolsRepo.get(tenantId, id);
    if (!tool) return notFound();
    return ok(tool);
  } catch (err) {
    return serverError(err);
  }
};

export const upsert: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const tool = parseBody(event, ToolSchema);
    return ok(await toolsRepo.put(tenantId, tool));
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return serverError(err);
  }
};

export const del: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const id = ToolIdSchema.parse(event.pathParameters?.id);
    await toolsRepo.delete(tenantId, id);
    return noContent();
  } catch (err) {
    return serverError(err);
  }
};
