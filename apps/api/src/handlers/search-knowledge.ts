import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import {
  SearchKnowledgeRequestSchema,
  type SearchKnowledgeResponse,
} from "@sable/shared";
import { rawBody } from "../lib/parse.js";
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "../lib/response.js";
import {
  readWebhookHeaders,
  verifyWebhook,
  WebhookAuthError,
} from "../lib/webhook-hmac.js";

let _client: BedrockAgentRuntimeClient | undefined;
const bedrock = () =>
  (_client ??= new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION ?? "eu-west-1" }));

function verifyOrThrow(event: APIGatewayProxyEventV2) {
  const hdr = readWebhookHeaders(event.headers as Record<string, string | undefined>);
  verifyWebhook(rawBody(event), hdr);
  return hdr;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const hdr = verifyOrThrow(event);
    const req = SearchKnowledgeRequestSchema.parse(JSON.parse(rawBody(event)));
    if (req.tenantId !== hdr.tenantId) return unauthorized("tenant mismatch");

    const kbId = process.env.BEDROCK_KB_ID;
    if (!kbId) {
      return ok({ results: [] } satisfies SearchKnowledgeResponse);
    }

    const res = await bedrock().send(
      new RetrieveCommand({
        knowledgeBaseId: kbId,
        retrievalQuery: { text: req.query },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: req.topK,
            filter: {
              equals: { key: "tenantId", value: req.tenantId },
            },
          },
        },
      }),
    );

    const results = (res.retrievalResults ?? []).map((r) => ({
      content: r.content?.text ?? "",
      score: r.score ?? 0,
      source: r.location?.s3Location?.uri,
    }));

    return ok({ results } satisfies SearchKnowledgeResponse);
  } catch (err) {
    if (err instanceof WebhookAuthError) return unauthorized(err.message);
    if (err instanceof Error && err.name === "ZodError") return badRequest(err.message);
    return serverError(err);
  }
};
