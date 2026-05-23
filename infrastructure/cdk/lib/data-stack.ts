import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";

export interface DataStackProps extends cdk.StackProps {
  prefix: string;
}

export class DataStack extends cdk.Stack {
  public readonly table: dynamodb.TableV2;
  public readonly knowledgeBucket: s3.Bucket;
  public readonly secretsPrefix: string;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.table = new dynamodb.TableV2(this, "MainTable", {
      tableName: `${props.prefix}-main`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      globalSecondaryIndexes: [
        {
          indexName: "GSI1",
          partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
          sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
          projectionType: dynamodb.ProjectionType.ALL,
        },
      ],
      deletionProtection: true,
    });

    const knowledgeKey = new kms.Key(this, "KnowledgeKey", {
      alias: `alias/${props.prefix}-knowledge`,
      description: "KMS key for tenant knowledge bucket SSE",
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.knowledgeBucket = new s3.Bucket(this, "KnowledgeBucket", {
      bucketName: `${props.prefix}-knowledge-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: knowledgeKey,
      bucketKeyEnabled: true,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      eventBridgeEnabled: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        { abortIncompleteMultipartUploadAfter: cdk.Duration.days(7) },
        { noncurrentVersionExpiration: cdk.Duration.days(90) },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.secretsPrefix = `${props.prefix}/tenants`;

    new cdk.CfnOutput(this, "TableName", { value: this.table.tableName });
    new cdk.CfnOutput(this, "KnowledgeBucketName", { value: this.knowledgeBucket.bucketName });
    new cdk.CfnOutput(this, "SecretsPrefix", { value: this.secretsPrefix });
  }
}
