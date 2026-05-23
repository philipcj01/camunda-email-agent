import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import { ThreadIdSchema } from "@sable/shared";
import { messagesRepo, threadsRepo } from "@sable/storage";
import { tenantFrom } from "../lib/auth.js";
import { notFound, ok, serverError } from "../lib/response.js";

export const listThreads: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const cursor = event.queryStringParameters?.cursor;
    const limit = Number(event.queryStringParameters?.limit ?? 25);
    return ok(await threadsRepo.listInbox(tenantId, { cursor, limit }));
  } catch (err) {
    return serverError(err);
  }
};

export const getThread: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const threadId = ThreadIdSchema.parse(event.pathParameters?.id);
    const thread = await threadsRepo.get(tenantId, threadId);
    if (!thread) return notFound();
    const messages = await messagesRepo.listForThread(tenantId, threadId);
    return ok({ thread, messages });
  } catch (err) {
    return serverError(err);
  }
};
