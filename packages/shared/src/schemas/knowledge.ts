import { z } from "zod";
import { KnowledgeIdSchema } from "../ids.js";

export const KnowledgeSyncStatusSchema = z.enum([
  "pending",
  "indexing",
  "ready",
  "failed",
]);
export type KnowledgeSyncStatus = z.infer<typeof KnowledgeSyncStatusSchema>;

export const KnowledgeDocSchema = z.object({
  id: KnowledgeIdSchema,
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  s3Key: z.string(),
  uploadedAt: z.string().datetime(),
  syncStatus: KnowledgeSyncStatusSchema.default("pending"),
  syncedAt: z.string().datetime().optional(),
  bedrockDataSourceId: z.string().optional(),
  /** When the Bedrock ingestion job last failed, the human-readable reason. */
  syncError: z.string().optional(),
});
export type KnowledgeDoc = z.infer<typeof KnowledgeDocSchema>;

export const PresignedUploadResponseSchema = z.object({
  id: KnowledgeIdSchema,
  uploadUrl: z.string().url(),
  fields: z.record(z.string(), z.string()),
  s3Key: z.string(),
});
export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponseSchema>;
