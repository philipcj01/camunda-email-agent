import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { storageConfig } from "./config.js";

let _ddb: DynamoDBDocumentClient | undefined;
let _s3: S3Client | undefined;
let _sm: SecretsManagerClient | undefined;

export function ddb(): DynamoDBDocumentClient {
  if (!_ddb) {
    _ddb = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: storageConfig.region() }),
      { marshallOptions: { removeUndefinedValues: true } },
    );
  }
  return _ddb;
}

export function s3(): S3Client {
  if (!_s3) _s3 = new S3Client({ region: storageConfig.region() });
  return _s3;
}

export function secretsManager(): SecretsManagerClient {
  if (!_sm) _sm = new SecretsManagerClient({ region: storageConfig.region() });
  return _sm;
}
