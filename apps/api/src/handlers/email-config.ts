import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import {
  EmailConfigInputSchema,
  EmailConfigSchema,
  type EmailConfig,
} from "@sable/shared";
import { emailConfigRepo, secretsHelpers } from "@sable/storage";
import { tenantFrom } from "../lib/auth.js";
import { parseBody } from "../lib/parse.js";
import { ok, serverError } from "../lib/response.js";

export const get: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const cfg = await emailConfigRepo.get(tenantId);
    if (!cfg) return ok(null);
    // Never leak ARNs unless the UI needs them for display — UI just needs to know
    // a password is set. Mask presence as a boolean for the frontend.
    return ok({
      inbound: { ...cfg.inbound, passwordSet: Boolean(cfg.inbound.passwordSecretArn) },
      outbound: { ...cfg.outbound, passwordSet: Boolean(cfg.outbound.passwordSecretArn) },
      updatedAt: cfg.updatedAt,
    });
  } catch (err) {
    return serverError(err);
  }
};

export const put: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const tenantId = tenantFrom(event as APIGatewayProxyEventV2WithJWTAuthorizer);
    const input = parseBody(event, EmailConfigInputSchema);
    const existing = await emailConfigRepo.get(tenantId);

    const inboundArn =
      input.inbound.password
        ? await secretsHelpers.upsertString(tenantId, "imap_pass", input.inbound.password)
        : existing?.inbound.passwordSecretArn;
    if (!inboundArn) {
      throw new Error("Inbound password is required for the first save");
    }

    const outboundArn =
      input.outbound.password
        ? await secretsHelpers.upsertString(tenantId, "smtp_pass", input.outbound.password)
        : existing?.outbound.passwordSecretArn;
    if (!outboundArn) {
      throw new Error("Outbound password is required for the first save");
    }

    const next: EmailConfig = EmailConfigSchema.parse({
      inbound: { ...input.inbound, passwordSecretArn: inboundArn },
      outbound: { ...input.outbound, passwordSecretArn: outboundArn },
    });

    const saved = await emailConfigRepo.put(tenantId, next);
    return ok({ ok: true, updatedAt: saved.updatedAt });
  } catch (err) {
    return serverError(err);
  }
};
