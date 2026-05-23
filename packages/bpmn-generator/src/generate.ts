import {
  camundaSecretName,
  processIdForTenant,
  type AgentConfig,
  type EmailConfig,
  type TenantId,
  type Tool,
  WEBHOOK_HEADER_SIGNATURE,
  WEBHOOK_HEADER_TENANT,
  WEBHOOK_HEADER_TIMESTAMP,
} from "@camunda-email-agent/shared";
import { hashBpmn } from "./hash.js";
import { xmlEscape } from "./xml.js";

export interface GenerateBpmnInput {
  tenantId: TenantId;
  agentConfig: AgentConfig;
  emailConfig: EmailConfig;
  tools: Tool[];
  /** Base URL of our backend API (the BPMN posts webhooks here). */
  apiBaseUrl: string;
}

export interface GeneratedBpmn {
  xml: string;
  hash: string;
  processId: string;
  /** Tenant-namespaced Camunda secret name → desired plaintext value resolver hint. */
  secretsToProvision: Array<{ key: string; sourceSecretArn: string }>;
}

/**
 * Generate a deterministic BPMN process for the given tenant configuration.
 *
 * Determinism notes:
 *  - Tools are sorted by id before emission.
 *  - Guardrails are sorted by id.
 *  - No timestamps or random ids appear in the output.
 */
export function generateBpmn(input: GenerateBpmnInput): GeneratedBpmn {
  const { tenantId, agentConfig, emailConfig, tools, apiBaseUrl } = input;

  const processId = processIdForTenant(tenantId);
  const definitionsId = `Definitions_${tenantId}`;
  const collabId = `Collaboration_${tenantId}`;

  const sortedTools = [...tools].filter((t) => t.enabled).sort((a, b) => a.id.localeCompare(b.id));
  const sortedGuardrails = [...agentConfig.guardrails]
    .filter((g) => g.enabled)
    .sort((a, b) => a.id.localeCompare(b.id));

  const imapSecretName = camundaSecretName(tenantId, "IMAP_PASS");
  const smtpSecretName = camundaSecretName(tenantId, "SMTP_PASS");
  const webhookSecretName = camundaSecretName(tenantId, "WEBHOOK_HMAC");

  const secretsToProvision = [
    { key: "IMAP_PASS", sourceSecretArn: emailConfig.inbound.passwordSecretArn },
    { key: "SMTP_PASS", sourceSecretArn: emailConfig.outbound.passwordSecretArn },
  ];

  const systemPrompt = renderSystemPrompt(agentConfig, sortedGuardrails);

  const toolDescriptors = [
    {
      name: "search_knowledge",
      description: "Search the tenant's knowledge base for relevant context.",
      type: "http",
      method: "POST",
      url: `${apiBaseUrl}/tools/search-knowledge`,
      inputSchema: {
        query: { type: "string", required: true, description: "Natural-language query" },
        topK: { type: "number", required: false, description: "Top K results (default 5)" },
      },
    },
    {
      name: "send_email",
      description: "Send a reply email via the configured SMTP connector.",
      type: "builtin:send_email",
      inputSchema: {
        subject: { type: "string", required: true, description: "Subject line" },
        textBody: { type: "string", required: true, description: "Plain text body" },
        htmlBody: { type: "string", required: false, description: "Optional HTML body" },
      },
    },
    ...sortedTools.map((t) => toolDescriptor(t)),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"`,
    `                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"`,
    `                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"`,
    `                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"`,
    `                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
    `                  xmlns:zeebe="http://camunda.org/schema/zeebe/1.0"`,
    `                  id="${definitionsId}"`,
    `                  targetNamespace="http://camunda.org/email-agent">`,
    `  <bpmn:collaboration id="${collabId}">`,
    `    <bpmn:participant id="Participant_${tenantId}" name="Email Agent" processRef="${processId}" />`,
    `  </bpmn:collaboration>`,
    `  <bpmn:process id="${processId}" name="Email Agent (${xmlEscape(tenantId)})" isExecutable="true">`,
    ``,
    `    <!-- Inbound email connector start event -->`,
    `    <bpmn:startEvent id="StartEvent_EmailReceived" name="Email received">`,
    `      <bpmn:extensionElements>`,
    `        <zeebe:properties>`,
    `          <zeebe:property name="inbound.type" value="io.camunda:email:1" />`,
    `        </zeebe:properties>`,
    `        <zeebe:ioMapping>`,
    `          <zeebe:output source="=email" target="email" />`,
    `        </zeebe:ioMapping>`,
    `      </bpmn:extensionElements>`,
    `      <bpmn:outgoing>Flow_Start_To_StoreInbound</bpmn:outgoing>`,
    `    </bpmn:startEvent>`,
    `    <bpmn:sequenceFlow id="Flow_Start_To_StoreInbound" sourceRef="StartEvent_EmailReceived" targetRef="ServiceTask_StoreInbound" />`,
    ``,
    `    <!-- Persist the inbound email in our system -->`,
    serviceTaskRestCall({
      id: "ServiceTask_StoreInbound",
      name: "Store inbound email",
      method: "POST",
      url: `${apiBaseUrl}/webhooks/email-received`,
      bodyFeel: `={tenantId: "${tenantId}", processInstanceKey: string(processInstanceKey), email: email}`,
      hmacSecretName: webhookSecretName,
      tenantId,
      outgoing: "Flow_StoreInbound_To_Agent",
    }),
    `    <bpmn:sequenceFlow id="Flow_StoreInbound_To_Agent" sourceRef="ServiceTask_StoreInbound" targetRef="ServiceTask_AIAgent" />`,
    ``,
    `    <!-- AI Agent task — Camunda AI Agent connector -->`,
    aiAgentTask({
      id: "ServiceTask_AIAgent",
      systemPrompt,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      maxIterations: agentConfig.maxIterations,
      tools: toolDescriptors,
      outgoing: "Flow_Agent_To_SendOrComplete",
    }),
    `    <bpmn:sequenceFlow id="Flow_Agent_To_SendOrComplete" sourceRef="ServiceTask_AIAgent" targetRef="ServiceTask_SendEmail" />`,
    ``,
    `    <!-- Outbound email via SMTP connector -->`,
    sendEmailTask({
      id: "ServiceTask_SendEmail",
      smtp: emailConfig.outbound,
      smtpSecretName,
      outgoing: "Flow_Send_To_Complete",
    }),
    `    <bpmn:sequenceFlow id="Flow_Send_To_Complete" sourceRef="ServiceTask_SendEmail" targetRef="ServiceTask_StoreCompleted" />`,
    ``,
    `    <!-- Persist agent run + outbound mail in our system -->`,
    serviceTaskRestCall({
      id: "ServiceTask_StoreCompleted",
      name: "Store completion + chat history",
      method: "POST",
      url: `${apiBaseUrl}/webhooks/email-completed`,
      bodyFeel: `={tenantId: "${tenantId}", processInstanceKey: string(processInstanceKey), threadId: threadId, steps: agentSteps, outbound: sentEmail}`,
      hmacSecretName: webhookSecretName,
      tenantId,
      outgoing: "Flow_Complete_To_End",
    }),
    `    <bpmn:sequenceFlow id="Flow_Complete_To_End" sourceRef="ServiceTask_StoreCompleted" targetRef="EndEvent_Done" />`,
    ``,
    `    <bpmn:endEvent id="EndEvent_Done" name="Done">`,
    `      <bpmn:incoming>Flow_Complete_To_End</bpmn:incoming>`,
    `    </bpmn:endEvent>`,
    ``,
    `    <!-- Inbound connector configuration (Camunda Email connector, IMAP) -->`,
    `    <bpmn:extensionElements>`,
    `      <zeebe:properties>`,
    `        <zeebe:property name="inbound.type" value="io.camunda:email:1" />`,
    `        <zeebe:property name="inbound.protocol" value="imap" />`,
    `        <zeebe:property name="inbound.host" value="${xmlEscape(emailConfig.inbound.host)}" />`,
    `        <zeebe:property name="inbound.port" value="${emailConfig.inbound.port}" />`,
    `        <zeebe:property name="inbound.secure" value="${emailConfig.inbound.secure}" />`,
    `        <zeebe:property name="inbound.username" value="${xmlEscape(emailConfig.inbound.username)}" />`,
    `        <zeebe:property name="inbound.password" value="{{secrets.${imapSecretName}}}" />`,
    `        <zeebe:property name="inbound.folder" value="${xmlEscape(emailConfig.inbound.folder)}" />`,
    `        <zeebe:property name="inbound.pollIntervalSeconds" value="${emailConfig.inbound.pollIntervalSeconds}" />`,
    `      </zeebe:properties>`,
    `    </bpmn:extensionElements>`,
    `  </bpmn:process>`,
    `</bpmn:definitions>`,
    ``,
  ].join("\n");

  return { xml, hash: hashBpmn(xml), processId, secretsToProvision };
}

function renderSystemPrompt(
  agent: AgentConfig,
  guardrails: AgentConfig["guardrails"],
): string {
  const parts: string[] = [agent.systemPrompt.trim()];
  if (agent.persona) parts.push(`\nPersona / tone:\n${agent.persona.trim()}`);
  if (guardrails.length > 0) {
    parts.push("\nHard rules (you MUST follow):");
    guardrails.forEach((g, i) => parts.push(`${i + 1}. ${g.instruction}`));
  }
  if (!agent.autoReply) {
    parts.push("\nNote: auto-reply is disabled. Compose a draft but do not send it.");
  }
  return parts.join("\n");
}

interface ToolDescriptorOut {
  name: string;
  description: string;
  type: string;
  method?: string;
  url?: string;
  feel?: string;
  inputSchema: Record<string, { type: string; required: boolean; description: string }>;
}

function toolDescriptor(t: Tool): ToolDescriptorOut {
  const inputSchema: ToolDescriptorOut["inputSchema"] = {};
  for (const p of t.params) {
    inputSchema[p.name] = { type: p.type, required: p.required, description: p.description };
  }
  if (t.type === "http") {
    return {
      name: t.name,
      description: t.description,
      type: "http",
      method: t.http.method,
      url: t.http.url,
      inputSchema,
    };
  }
  return {
    name: t.name,
    description: t.description,
    type: "feel",
    feel: t.feel.expression,
    inputSchema,
  };
}

function serviceTaskRestCall(opts: {
  id: string;
  name: string;
  method: string;
  url: string;
  bodyFeel: string;
  hmacSecretName: string;
  tenantId: TenantId;
  outgoing: string;
}): string {
  return [
    `    <bpmn:serviceTask id="${opts.id}" name="${xmlEscape(opts.name)}">`,
    `      <bpmn:extensionElements>`,
    `        <zeebe:taskDefinition type="io.camunda:http-json:1" />`,
    `        <zeebe:ioMapping>`,
    `          <zeebe:input source="${opts.method}" target="method" />`,
    `          <zeebe:input source="${opts.url}" target="url" />`,
    `          <zeebe:input source="${opts.bodyFeel}" target="body" />`,
    `          <zeebe:input source='={"${WEBHOOK_HEADER_TENANT}": "${opts.tenantId}", "${WEBHOOK_HEADER_TIMESTAMP}": string(now()), "${WEBHOOK_HEADER_SIGNATURE}": "{{secrets.${opts.hmacSecretName}}}"}' target="headers" />`,
    `        </zeebe:ioMapping>`,
    `        <zeebe:taskHeaders>`,
    `          <zeebe:header key="retryBackoff" value="PT5S" />`,
    `        </zeebe:taskHeaders>`,
    `      </bpmn:extensionElements>`,
    `      <bpmn:incoming>Flow_${opts.id}_in</bpmn:incoming>`,
    `      <bpmn:outgoing>${opts.outgoing}</bpmn:outgoing>`,
    `    </bpmn:serviceTask>`,
  ].join("\n");
}

function aiAgentTask(opts: {
  id: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxIterations: number;
  tools: ToolDescriptorOut[];
  outgoing: string;
}): string {
  const toolsJson = JSON.stringify(opts.tools, null, 2)
    .split("\n")
    .map((l) => "            " + l)
    .join("\n");

  return [
    `    <bpmn:serviceTask id="${opts.id}" name="AI Agent">`,
    `      <bpmn:extensionElements>`,
    `        <zeebe:taskDefinition type="io.camunda.agenticai:aiagent:1" />`,
    `        <zeebe:ioMapping>`,
    `          <zeebe:input source="${xmlEscape(JSON.stringify(opts.systemPrompt))}" target="systemPrompt" />`,
    `          <zeebe:input source="${opts.model}" target="model" />`,
    `          <zeebe:input source="${opts.temperature}" target="temperature" />`,
    `          <zeebe:input source="${opts.maxIterations}" target="maxIterations" />`,
    `          <zeebe:input source="=email" target="input" />`,
    `          <zeebe:input target="tools">`,
    `            <zeebe:source>`,
    toolsJson,
    `            </zeebe:source>`,
    `          </zeebe:input>`,
    `          <zeebe:output source="=response.steps" target="agentSteps" />`,
    `          <zeebe:output source="=response.reply" target="agentReply" />`,
    `          <zeebe:output source="=response.threadId" target="threadId" />`,
    `        </zeebe:ioMapping>`,
    `      </bpmn:extensionElements>`,
    `      <bpmn:outgoing>${opts.outgoing}</bpmn:outgoing>`,
    `    </bpmn:serviceTask>`,
  ].join("\n");
}

function sendEmailTask(opts: {
  id: string;
  smtp: EmailConfig["outbound"];
  smtpSecretName: string;
  outgoing: string;
}): string {
  return [
    `    <bpmn:serviceTask id="${opts.id}" name="Send email reply">`,
    `      <bpmn:extensionElements>`,
    `        <zeebe:taskDefinition type="io.camunda:email:1" />`,
    `        <zeebe:ioMapping>`,
    `          <zeebe:input source="smtp" target="protocol" />`,
    `          <zeebe:input source="${xmlEscape(opts.smtp.host)}" target="host" />`,
    `          <zeebe:input source="${opts.smtp.port}" target="port" />`,
    `          <zeebe:input source="${opts.smtp.secure}" target="secure" />`,
    `          <zeebe:input source="${xmlEscape(opts.smtp.username)}" target="username" />`,
    `          <zeebe:input source='{{secrets.${opts.smtpSecretName}}}' target="password" />`,
    `          <zeebe:input source="${xmlEscape(opts.smtp.fromAddress)}" target="from" />`,
    `          <zeebe:input source="=agentReply.to" target="to" />`,
    `          <zeebe:input source="=agentReply.subject" target="subject" />`,
    `          <zeebe:input source="=agentReply.textBody" target="text" />`,
    `          <zeebe:input source="=agentReply.htmlBody" target="html" />`,
    `          <zeebe:output source="=response" target="sentEmail" />`,
    `        </zeebe:ioMapping>`,
    `      </bpmn:extensionElements>`,
    `      <bpmn:outgoing>${opts.outgoing}</bpmn:outgoing>`,
    `    </bpmn:serviceTask>`,
  ].join("\n");
}
