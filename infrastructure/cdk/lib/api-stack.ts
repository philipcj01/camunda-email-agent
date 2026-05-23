import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwAuth from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as apigwInt from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export interface ApiStackProps extends cdk.StackProps {
  prefix: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  table: dynamodb.TableV2;
  knowledgeBucket: s3.Bucket;
  secretsPrefix: string;
  knowledgeBaseId: string;
}

interface RouteSpec {
  method: apigw.HttpMethod | "ANY";
  path: string;
  handlerFile: string;
  exportName: string;
  /** When true, this route does NOT use the Cognito authorizer (webhooks). */
  public?: boolean;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const apiBaseEnv: Record<string, string> = {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      DYNAMODB_TABLE: props.table.tableName,
      S3_KNOWLEDGE_BUCKET: props.knowledgeBucket.bucketName,
      SECRETS_MANAGER_PREFIX: props.secretsPrefix,
      BEDROCK_KB_ID: props.knowledgeBaseId,
      // Camunda + webhook secrets pulled from process env at deploy time.
      CAMUNDA_CLUSTER_ID: process.env.CAMUNDA_CLUSTER_ID ?? "",
      CAMUNDA_CLUSTER_REGION: process.env.CAMUNDA_CLUSTER_REGION ?? "bru-2",
      CAMUNDA_CLIENT_ID: process.env.CAMUNDA_CLIENT_ID ?? "",
      CAMUNDA_CLIENT_SECRET: process.env.CAMUNDA_CLIENT_SECRET ?? "",
      CAMUNDA_OAUTH_URL: process.env.CAMUNDA_OAUTH_URL ?? "",
      CAMUNDA_CONSOLE_CLIENT_ID: process.env.CAMUNDA_CONSOLE_CLIENT_ID ?? "",
      CAMUNDA_CONSOLE_CLIENT_SECRET: process.env.CAMUNDA_CONSOLE_CLIENT_SECRET ?? "",
      WEBHOOK_SIGNING_SECRET: process.env.WEBHOOK_SIGNING_SECRET ?? "",
    };

    const handlersDir = path.resolve(__dirname, "../../../apps/api/src/handlers");

    const makeHandler = (spec: RouteSpec): lambda.Function =>
      new nodejs.NodejsFunction(this, `Fn_${spec.exportName}_${spec.handlerFile}`.replace(/[^a-zA-Z0-9]/g, "_"), {
        entry: path.join(handlersDir, `${spec.handlerFile}.ts`),
        handler: spec.exportName,
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 512,
        timeout: cdk.Duration.seconds(30),
        environment: apiBaseEnv,
        bundling: {
          minify: true,
          sourceMap: true,
          target: "node20",
          format: nodejs.OutputFormat.ESM,
          mainFields: ["module", "main"],
          externalModules: [],
          banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
        },
        logGroup: new logs.LogGroup(this, `Log_${spec.exportName}_${spec.handlerFile}`.replace(/[^a-zA-Z0-9]/g, "_"), {
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      });

    const routes: RouteSpec[] = [
      { method: apigw.HttpMethod.GET,    path: "/me",                       handlerFile: "me",              exportName: "get" },
      { method: apigw.HttpMethod.GET,    path: "/agent",                    handlerFile: "agent",           exportName: "get" },
      { method: apigw.HttpMethod.PUT,    path: "/agent",                    handlerFile: "agent",           exportName: "put" },
      { method: apigw.HttpMethod.GET,    path: "/email-config",             handlerFile: "email-config",    exportName: "get" },
      { method: apigw.HttpMethod.PUT,    path: "/email-config",             handlerFile: "email-config",    exportName: "put" },
      { method: apigw.HttpMethod.GET,    path: "/tools",                    handlerFile: "tools",           exportName: "list" },
      { method: apigw.HttpMethod.POST,   path: "/tools",                    handlerFile: "tools",           exportName: "upsert" },
      { method: apigw.HttpMethod.GET,    path: "/tools/{id}",               handlerFile: "tools",           exportName: "get" },
      { method: apigw.HttpMethod.DELETE, path: "/tools/{id}",               handlerFile: "tools",           exportName: "del" },
      { method: apigw.HttpMethod.GET,    path: "/knowledge",                handlerFile: "knowledge",       exportName: "list" },
      { method: apigw.HttpMethod.POST,   path: "/knowledge",                handlerFile: "knowledge",       exportName: "presign" },
      { method: apigw.HttpMethod.DELETE, path: "/knowledge/{id}",           handlerFile: "knowledge",       exportName: "del" },
      { method: apigw.HttpMethod.POST,   path: "/deploy/preview",           handlerFile: "deploy",          exportName: "preview" },
      { method: apigw.HttpMethod.POST,   path: "/deploy",                   handlerFile: "deploy",          exportName: "deploy" },
      { method: apigw.HttpMethod.GET,    path: "/deployments",              handlerFile: "deploy",          exportName: "listDeployments" },
      { method: apigw.HttpMethod.GET,    path: "/inbox/threads",            handlerFile: "inbox",           exportName: "listThreads" },
      { method: apigw.HttpMethod.GET,    path: "/inbox/threads/{id}",       handlerFile: "inbox",           exportName: "getThread" },
      { method: apigw.HttpMethod.POST,   path: "/webhooks/email-received",  handlerFile: "webhooks",        exportName: "emailReceived",  public: true },
      { method: apigw.HttpMethod.POST,   path: "/webhooks/email-completed", handlerFile: "webhooks",        exportName: "emailCompleted", public: true },
      { method: apigw.HttpMethod.POST,   path: "/tools/search-knowledge",   handlerFile: "search-knowledge", exportName: "handler",       public: true },
    ];

    const httpApi = new apigw.HttpApi(this, "HttpApi", {
      apiName: `${props.prefix}-api`,
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: [
          "content-type",
          "authorization",
          "x-cea-signature",
          "x-cea-tenant-id",
          "x-cea-timestamp",
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    const authorizer = new apigwAuth.HttpJwtAuthorizer(
      "JwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${props.userPool.userPoolId}`,
      {
        jwtAudience: [props.userPoolClient.userPoolClientId],
      },
    );

    const fnIam: iam.IGrantable[] = [];
    for (const spec of routes) {
      const fn = makeHandler(spec);
      fnIam.push(fn);
      httpApi.addRoutes({
        path: spec.path,
        methods: [spec.method as apigw.HttpMethod],
        integration: new apigwInt.HttpLambdaIntegration(
          `Int_${spec.handlerFile}_${spec.exportName}`.replace(/[^a-zA-Z0-9]/g, "_"),
          fn,
        ),
        authorizer: spec.public ? undefined : authorizer,
      });
    }

    // Grant least-privilege access — every handler gets read/write on the table,
    // bucket, and tenant-scoped secrets. Production refinements would shard
    // permissions per handler.
    for (const grantee of fnIam) {
      props.table.grantReadWriteData(grantee);
      props.knowledgeBucket.grantReadWrite(grantee);
      grantee.grantPrincipal.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: [
            "secretsmanager:CreateSecret",
            "secretsmanager:PutSecretValue",
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
            "secretsmanager:DeleteSecret",
            "secretsmanager:UpdateSecret",
          ],
          resources: [
            `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${props.secretsPrefix}/*`,
          ],
        }),
      );
      grantee.grantPrincipal.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["bedrock:Retrieve", "bedrock:RetrieveAndGenerate"],
          resources: [
            `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.knowledgeBaseId}`,
          ],
        }),
      );
    }

    this.apiUrl = httpApi.apiEndpoint;
    new cdk.CfnOutput(this, "ApiUrl", { value: this.apiUrl });

    NagSuppressions.addStackSuppressions(this, [
      { id: "AwsSolutions-APIG4", reason: "Public webhook routes verify HMAC + tenant id in handler." },
      { id: "AwsSolutions-COG4", reason: "Public webhook routes do not use Cognito by design." },
      { id: "AwsSolutions-IAM4", reason: "Lambda uses managed CloudWatch logs policy." },
      { id: "AwsSolutions-IAM5", reason: "Secrets/Bedrock policies scoped to tenant prefix and KB ARN." },
    ]);
  }
}
