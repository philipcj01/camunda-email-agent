import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost, type PresignedPost } from "@aws-sdk/s3-presigned-post";
import type { TenantId } from "@sable/shared";
import { s3 } from "./clients.js";
import { storageConfig } from "./config.js";

export const knowledgeKey = (tenantId: TenantId, docId: string, filename: string) =>
  `tenants/${tenantId}/knowledge/${docId}/${filename}`;

export const attachmentKey = (tenantId: TenantId, threadId: string, filename: string) =>
  `tenants/${tenantId}/attachments/${threadId}/${Date.now()}-${filename}`;

export interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export const s3Helpers = {
  async presignedUpload(opts: {
    key: string;
    contentType: string;
    maxBytes?: number;
    expiresInSeconds?: number;
  }): Promise<PresignedUpload> {
    const post: PresignedPost = await createPresignedPost(s3(), {
      Bucket: storageConfig.knowledgeBucket(),
      Key: opts.key,
      Conditions: [
        ["content-length-range", 1, opts.maxBytes ?? 25 * 1024 * 1024],
        ["eq", "$Content-Type", opts.contentType],
      ],
      Fields: { "Content-Type": opts.contentType },
      Expires: opts.expiresInSeconds ?? 300,
    });
    return { url: post.url, fields: post.fields, key: opts.key };
  },

  async exists(key: string): Promise<boolean> {
    try {
      await s3().send(
        new HeadObjectCommand({ Bucket: storageConfig.knowledgeBucket(), Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  },

  async put(opts: { key: string; body: Buffer | string; contentType: string }) {
    await s3().send(
      new PutObjectCommand({
        Bucket: storageConfig.knowledgeBucket(),
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
      }),
    );
  },

  async delete(key: string) {
    await s3().send(
      new DeleteObjectCommand({ Bucket: storageConfig.knowledgeBucket(), Key: key }),
    );
  },
};
