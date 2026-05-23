import { createHmac, timingSafeEqual } from "node:crypto";
import {
  WEBHOOK_HEADER_SIGNATURE,
  WEBHOOK_HEADER_TENANT,
  WEBHOOK_HEADER_TIMESTAMP,
} from "@camunda-email-agent/shared";

const SIGNING_SECRET = () => {
  const v = process.env.WEBHOOK_SIGNING_SECRET;
  if (!v) throw new Error("Missing WEBHOOK_SIGNING_SECRET");
  return v;
};

/** Max age of a webhook signature, in seconds. Prevents replay. */
const MAX_AGE_SECONDS = 5 * 60;

export function signWebhook(payload: string, timestamp: string): string {
  return createHmac("sha256", SIGNING_SECRET())
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

export interface ParsedWebhookHeaders {
  tenantId: string;
  timestamp: string;
  signature: string;
}

export function readWebhookHeaders(
  headers: Record<string, string | undefined>,
): ParsedWebhookHeaders {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const tenantId = lower[WEBHOOK_HEADER_TENANT];
  const timestamp = lower[WEBHOOK_HEADER_TIMESTAMP];
  const signature = lower[WEBHOOK_HEADER_SIGNATURE];
  if (!tenantId || !timestamp || !signature) {
    throw new WebhookAuthError("Missing webhook headers");
  }
  return { tenantId, timestamp, signature };
}

export function verifyWebhook(payload: string, hdr: ParsedWebhookHeaders): void {
  const ageSec = Math.abs(Date.now() / 1000 - Number(hdr.timestamp));
  if (!Number.isFinite(ageSec) || ageSec > MAX_AGE_SECONDS) {
    throw new WebhookAuthError("Webhook timestamp out of range");
  }
  const expected = signWebhook(payload, hdr.timestamp);
  const a = Buffer.from(expected);
  const b = Buffer.from(hdr.signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WebhookAuthError("Invalid webhook signature");
  }
}

export class WebhookAuthError extends Error {}
