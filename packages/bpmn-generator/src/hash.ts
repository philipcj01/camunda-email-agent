import { createHash } from "node:crypto";

export const hashBpmn = (xml: string): string =>
  createHash("sha256").update(xml).digest("hex");
