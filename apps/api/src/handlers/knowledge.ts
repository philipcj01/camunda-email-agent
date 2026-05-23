import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import { z } from "zod";
import { KnowledgeIdSchema, type KnowledgeDoc } from "@camunda-email-agent/shared";
import { knowledgeRepo, knowledgeKey, s3Helpers } from "@camunda-email-agent/storage";
import { tenantFrom } from "../lib/auth.js";
import { parseBody } from "../lib/parse.js";
import { created, noContent, notFound, ok, serverError } from "../lib/response.js";

const PresignReqSchema = z.object({
  filename: z.string().min(1).max(256),
  contentType: z.string().min(1).max(128),
  sizeBytes: z.number().int().nonnegative(),
});

export const list: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    return ok(await knowledgeRepo.list(tenantId));
  } catch (err) {
    return serverError(err);
  }
};

export const presign: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const req = parseBody(event, PresignReqSchema);
    const id = randomUUID();
    const key = knowledgeKey(tenantId, id, req.filename);
    const presigned = await s3Helpers.presignedUpload({
      key,
      contentType: req.contentType,
      maxBytes: 50 * 1024 * 1024,
    });

    const doc: KnowledgeDoc = {
      id,
      filename: req.filename,
      contentType: req.contentType,
      size: req.sizeBytes,
      s3Key: key,
      uploadedAt: new Date().toISOString(),
      syncStatus: "pending",
    };
    await knowledgeRepo.put(tenantId, doc);

    return created({
      id,
      uploadUrl: presigned.url,
      fields: presigned.fields,
      s3Key: key,
    });
  } catch (err) {
    return serverError(err);
  }
};

export const del: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const id = KnowledgeIdSchema.parse(event.pathParameters?.id);
    const doc = await knowledgeRepo.get(tenantId, id);
    if (!doc) return notFound();
    await s3Helpers.delete(doc.s3Key);
    await knowledgeRepo.delete(tenantId, id);
    // NOTE: Bedrock KB ingestion re-runs on a schedule via the data source; nothing
    // else to do here. Status flips to "pending" automatically on next sync.
    return noContent();
  } catch (err) {
    return serverError(err);
  }
};
