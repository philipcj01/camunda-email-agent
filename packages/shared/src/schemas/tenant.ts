import { z } from "zod";
import { TenantIdSchema } from "../ids.js";

export const TenantProfileSchema = z.object({
  tenantId: TenantIdSchema,
  displayName: z.string().min(1).max(128),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
});
export type TenantProfile = z.infer<typeof TenantProfileSchema>;
