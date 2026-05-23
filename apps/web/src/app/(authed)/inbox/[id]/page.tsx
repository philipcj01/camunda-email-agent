"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { ArrowLeft, Bot, Hammer, Mail, Sparkles, Send } from "lucide-react";
import type { Email, AgentStep, Thread, ThreadMessage } from "@camunda-email-agent/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface ThreadDetail { thread: Thread; messages: ThreadMessage[] }

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);

  useEffect(() => {
    api<ThreadDetail>(`/inbox/threads/${encodeURIComponent(id)}`)
      .then(setDetail)
      .catch(console.error);
  }, [id]);

  if (!detail) return <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>;
  const { thread, messages } = detail;

  return (
    <div className="space-y-6">
      <Link href="/inbox">
        <Button variant="ghost" size="sm"><ArrowLeft className="size-4" /> Back to inbox</Button>
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{thread.subject || "(no subject)"}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          {thread.participants.map((p, i) => (
            <Badge key={i} variant="outline">{p.address}</Badge>
          ))}
          <Badge variant="secondary">{thread.messageCount} messages</Badge>
        </div>
      </header>

      <div className="space-y-3">
        {messages.map((m, i) => (m.kind === "email" ? (
          <EmailCard key={i} email={m.email} />
        ) : (
          <AgentStepCard key={i} step={m.step} />
        )))}
      </div>
    </div>
  );
}

function EmailCard({ email }: { email: Email }) {
  const Icon = email.direction === "inbound" ? Mail : Send;
  const safeHtml = useMemo(
    () =>
      email.htmlBody
        ? DOMPurify.sanitize(email.htmlBody, {
            FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
            FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
          })
        : undefined,
    [email.htmlBody],
  );

  return (
    <Card className={email.direction === "outbound" ? "border-l-4 border-l-[var(--color-primary)]" : ""}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-[var(--color-primary)]" />
            {email.direction === "inbound" ? "From " : "Sent to "}
            <span className="font-normal">
              {email.direction === "inbound"
                ? email.from.address
                : email.to.map((t) => t.address).join(", ")}
            </span>
          </CardTitle>
          <CardDescription>{email.subject}</CardDescription>
        </div>
        <div className="text-xs text-[var(--color-muted-foreground)]">
          {new Date(email.receivedAt).toLocaleString()}
        </div>
      </CardHeader>
      <CardContent>
        {safeHtml ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            // Content is sanitized above with DOMPurify (no scripts, no event handlers).
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{email.textBody}</pre>
        )}
      </CardContent>
    </Card>
  );
}

function AgentStepCard({ step }: { step: AgentStep }) {
  const config = {
    thought: { icon: Sparkles, label: "Thought" },
    tool_call: { icon: Hammer, label: `Tool call: ${step.toolName ?? "tool"}` },
    tool_result: { icon: Hammer, label: `Tool result: ${step.toolName ?? "tool"}` },
    final_reply: { icon: Bot, label: "Final reply" },
  }[step.kind];
  const Icon = config.icon;

  return (
    <details className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/50 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer items-center gap-2 font-medium text-[var(--color-foreground)]">
        <Icon className="size-3.5 text-[var(--color-muted-foreground)]" />
        {config.label}
        <span className="ml-auto text-[var(--color-muted-foreground)] font-normal">
          {new Date(step.ts).toLocaleTimeString()}
        </span>
      </summary>
      <div className="mt-2 space-y-2 text-[var(--color-muted-foreground)]">
        {step.content && <p className="whitespace-pre-wrap">{step.content}</p>}
        {step.toolInput !== undefined && (
          <pre className="overflow-auto rounded bg-[var(--color-background)] p-2">
            input: {JSON.stringify(step.toolInput, null, 2)}
          </pre>
        )}
        {step.toolOutput !== undefined && (
          <pre className="overflow-auto rounded bg-[var(--color-background)] p-2">
            output: {JSON.stringify(step.toolOutput, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}
