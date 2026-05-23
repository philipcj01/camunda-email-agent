import type { APIGatewayProxyResultV2 } from "aws-lambda";

const CORS = {
  "access-control-allow-origin": process.env.CORS_ORIGIN ?? "*",
  "access-control-allow-headers": "content-type,authorization,x-sable-signature,x-sable-timestamp,x-sable-tenant-id",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export const json = (
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json", ...CORS, ...headers },
  body: JSON.stringify(body),
});

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);
export const noContent = (): APIGatewayProxyResultV2 => ({
  statusCode: 204,
  headers: { ...CORS },
  body: "",
});
export const badRequest = (message: string, details?: unknown) =>
  json(400, { error: "bad_request", message, details });
export const unauthorized = (message = "Unauthorized") =>
  json(401, { error: "unauthorized", message });
export const forbidden = (message = "Forbidden") =>
  json(403, { error: "forbidden", message });
export const notFound = (message = "Not found") =>
  json(404, { error: "not_found", message });
export const serverError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("internal_error", err);
  return json(500, { error: "internal_error", message });
};
