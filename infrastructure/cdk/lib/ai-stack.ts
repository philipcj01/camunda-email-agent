import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as opensearchserverless from "aws-cdk-lib/aws-opensearchserverless";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export interface AiStackProps extends cdk.StackProps {
  prefix: string;
  knowledgeBucket: s3.Bucket;
}

/**
 * Bedrock Knowledge Base + OpenSearch Serverless vector collection.
 * Tenant scoping is enforced at retrieval time via metadata filter
 * (`equals: { key: "tenantId", value: req.tenantId }`).
 */
export class AiStack extends cdk.Stack {
  public readonly knowledgeBaseId: string;

  constructor(scope: Construct, id: string, props: AiStackProps) {
    super(scope, id, props);

    const collection = new opensearchserverless.CfnCollection(this, "KbCollection", {
      name: `${props.prefix}-kb`,
      type: "VECTORSEARCH",
      standbyReplicas: "DISABLED",
    });

    const kbRole = new iam.Role(this, "KbRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: "Bedrock Knowledge Base service role",
    });
    kbRole.addToPolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
      ],
    }));
    kbRole.addToPolicy(new iam.PolicyStatement({
      actions: ["aoss:APIAccessAll"],
      resources: [collection.attrArn],
    }));
    props.knowledgeBucket.grantRead(kbRole);

    const securityPolicy = new opensearchserverless.CfnSecurityPolicy(this, "KbEncPolicy", {
      name: `${props.prefix}-enc`,
      type: "encryption",
      policy: JSON.stringify({
        Rules: [{ ResourceType: "collection", Resource: [`collection/${collection.name}`] }],
        AWSOwnedKey: true,
      }),
    });
    collection.addDependency(securityPolicy);

    new opensearchserverless.CfnSecurityPolicy(this, "KbNetworkPolicy", {
      name: `${props.prefix}-net`,
      type: "network",
      policy: JSON.stringify([
        {
          Rules: [
            { ResourceType: "collection", Resource: [`collection/${collection.name}`] },
            { ResourceType: "dashboard", Resource: [`collection/${collection.name}`] },
          ],
          AllowFromPublic: true,
        },
      ]),
    });

    new opensearchserverless.CfnAccessPolicy(this, "KbDataPolicy", {
      name: `${props.prefix}-data`,
      type: "data",
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: "collection",
              Resource: [`collection/${collection.name}`],
              Permission: ["aoss:*"],
            },
            {
              ResourceType: "index",
              Resource: [`index/${collection.name}/*`],
              Permission: ["aoss:*"],
            },
          ],
          Principal: [kbRole.roleArn],
        },
      ]),
    });

    const kb = new bedrock.CfnKnowledgeBase(this, "Kb", {
      name: `${props.prefix}-kb`,
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: "VECTOR",
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        },
      },
      storageConfiguration: {
        type: "OPENSEARCH_SERVERLESS",
        opensearchServerlessConfiguration: {
          collectionArn: collection.attrArn,
          vectorIndexName: `${props.prefix}-vectors`,
          fieldMapping: {
            vectorField: "bedrock-knowledge-base-default-vector",
            textField: "AMAZON_BEDROCK_TEXT_CHUNK",
            metadataField: "AMAZON_BEDROCK_METADATA",
          },
        },
      },
    });

    new bedrock.CfnDataSource(this, "KbDataSource", {
      name: `${props.prefix}-s3`,
      knowledgeBaseId: kb.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: { bucketArn: props.knowledgeBucket.bucketArn },
      },
    });

    this.knowledgeBaseId = kb.attrKnowledgeBaseId;
    new cdk.CfnOutput(this, "KnowledgeBaseId", { value: this.knowledgeBaseId });

    NagSuppressions.addStackSuppressions(this, [
      {
        id: "AwsSolutions-IAM5",
        reason:
          "Bedrock KB role needs index/* on the OpenSearch Serverless collection to manage vector indexes.",
      },
    ]);
  }
}
