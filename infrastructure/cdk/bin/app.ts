#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Aspects, Tags } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { AuthStack } from "../lib/auth-stack";
import { DataStack } from "../lib/data-stack";
import { AiStack } from "../lib/ai-stack";
import { ApiStack } from "../lib/api-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "eu-west-1",
};

const stage = app.node.tryGetContext("stage") ?? "dev";
const prefix = `cea-${stage}`;

const auth = new AuthStack(app, `${prefix}-auth`, { env, prefix });
const data = new DataStack(app, `${prefix}-data`, { env, prefix });
const ai = new AiStack(app, `${prefix}-ai`, {
  env,
  prefix,
  knowledgeBucket: data.knowledgeBucket,
});
const api = new ApiStack(app, `${prefix}-api`, {
  env,
  prefix,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
  table: data.table,
  knowledgeBucket: data.knowledgeBucket,
  secretsPrefix: data.secretsPrefix,
  knowledgeBaseId: ai.knowledgeBaseId,
});
new FrontendStack(app, `${prefix}-frontend`, {
  env,
  prefix,
  apiUrl: api.apiUrl,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
  cognitoDomain: auth.cognitoDomain,
});

Tags.of(app).add("Project", "camunda-email-agent");
Tags.of(app).add("Stage", stage);
Tags.of(app).add("Owner", "platform");

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
