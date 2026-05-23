function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const storageConfig = {
  region: () => process.env.AWS_REGION ?? "eu-west-1",
  tableName: () => required("DYNAMODB_TABLE"),
  knowledgeBucket: () => required("S3_KNOWLEDGE_BUCKET"),
  secretsPrefix: () => process.env.SECRETS_MANAGER_PREFIX ?? "sable",
};
