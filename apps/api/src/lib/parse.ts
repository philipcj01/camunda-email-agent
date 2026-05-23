import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { ZodTypeAny, z } from "zod";

export function parseBody<T extends ZodTypeAny>(
  event: APIGatewayProxyEventV2,
  schema: T,
): z.infer<T> {
  if (!event.body) throw new Error("Missing request body");
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;
  return schema.parse(JSON.parse(raw));
}

export function rawBody(event: APIGatewayProxyEventV2): string {
  if (!event.body) return "";
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;
}
