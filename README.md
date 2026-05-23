# Camunda 8 SaaS Email Agent

Multi-tenant platform for configuring email-driven AI agents that run on **Camunda 8 SaaS**. Sign in, configure your inbound/outbound email connector, AI agent prompts and guardrails, knowledge base, and tool catalog through a polished UI — then click **Deploy** and a tenant-specific BPMN process ships to your Camunda cluster.

The frontend also doubles as a best-in-class email **inbox**: every message ingested by the agent and every step it takes is captured and rendered in a Gmail-style thread view.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router) · shadcn/ui · Tailwind · AWS Amplify Hosting |
| API | AWS Lambda · API Gateway (REST) · Cognito authorizer |
| Storage | DynamoDB (single-table) · S3 · Secrets Manager |
| AI | Camunda **AI Agent connector** · Bedrock Knowledge Base · OpenSearch Serverless |
| Auth | AWS Cognito |
| Process engine | Camunda 8 SaaS · `@camunda8/sdk` · Console API |
| Infra | AWS CDK (TypeScript) · `cdk-nag` |
| Tooling | pnpm workspaces · Turborepo · TypeScript |

## Layout

```
apps/
  web/                 Next.js frontend
  api/                 Lambda handlers
packages/
  shared/              Zod schemas + shared types
  storage/             DynamoDB + S3 + Secrets Manager helpers
  bpmn-generator/      Generates tenant BPMN from config
  camunda-client/      @camunda8/sdk + Console API wrapper
infrastructure/
  cdk/                 AWS CDK stacks
bpmn/
  templates/           Base BPMN templates
```

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in Camunda + AWS values
cp .env.example .env

# 3. Provision AWS resources
pnpm --filter @sable/cdk deploy --all

# 4. Run frontend + API locally
pnpm dev
```

See `docs/` for deeper guides (env setup, Camunda SaaS provisioning, deploying to AWS).

## License

UNLICENSED — proprietary.
