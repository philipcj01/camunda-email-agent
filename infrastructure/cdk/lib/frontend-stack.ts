import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export interface FrontendStackProps extends cdk.StackProps {
  prefix: string;
  apiUrl: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  cognitoDomain: cognito.UserPoolDomain;
  /** Optional: GitHub repo URL + branch for Amplify auto-build. */
  githubRepo?: string;
  githubBranch?: string;
  githubTokenSecretName?: string;
}

/**
 * AWS Amplify Hosting app for the Next.js frontend.
 * If GitHub repo info is provided via context, Amplify connects directly;
 * otherwise the app is created without a source and you deploy via the
 * Amplify CLI or `amplify push`.
 */
export class FrontendStack extends cdk.Stack {
  public readonly app: amplify.CfnApp;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const envVars = {
      NEXT_PUBLIC_API_BASE_URL: props.apiUrl,
      NEXT_PUBLIC_COGNITO_USER_POOL_ID: props.userPool.userPoolId,
      NEXT_PUBLIC_COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
      NEXT_PUBLIC_COGNITO_DOMAIN: `${props.cognitoDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      NEXT_PUBLIC_AWS_REGION: this.region,
      AMPLIFY_MONOREPO_APP_ROOT: "apps/web",
      AMPLIFY_DIFF_DEPLOY: "false",
      _LIVE_UPDATES: JSON.stringify([{ pkg: "next-version", type: "internal", version: "latest" }]),
    };

    this.app = new amplify.CfnApp(this, "WebApp", {
      name: `${props.prefix}-web`,
      platform: "WEB_COMPUTE",
      environmentVariables: Object.entries(envVars).map(([name, value]) => ({ name, value })),
      ...(props.githubRepo && props.githubTokenSecretName ? {
        repository: props.githubRepo,
        accessToken: `{{resolve:secretsmanager:${props.githubTokenSecretName}:SecretString:token}}`,
      } : {}),
      buildSpec: `version: 1
applications:
  - appRoot: apps/web
    frontend:
      phases:
        preBuild:
          commands:
            - npm install -g pnpm@9
            - pnpm install --frozen-lockfile
        build:
          commands:
            - pnpm --filter @sable/web build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*`,
      customRules: [
        { source: "/<*>", target: "/index.html", status: "404-200" },
      ],
    });

    if (props.githubBranch) {
      new amplify.CfnBranch(this, "MainBranch", {
        appId: this.app.attrAppId,
        branchName: props.githubBranch,
        stage: "PRODUCTION",
        enableAutoBuild: true,
      });
    }

    new cdk.CfnOutput(this, "AmplifyAppId", { value: this.app.attrAppId });
    new cdk.CfnOutput(this, "AmplifyDefaultDomain", { value: this.app.attrDefaultDomain });
  }
}
