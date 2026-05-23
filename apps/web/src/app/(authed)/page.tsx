"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Inbox, Mail, Rocket, Wrench, BookOpen, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Deployment { version: number; status: string; createdAt: string }

const tiles = [
  { href: "/agent",     label: "AI Agent",    icon: Bot,        hint: "System prompt, guardrails, model" },
  { href: "/tools",     label: "Tools",       icon: Wrench,     hint: "HTTP & FEEL tools the agent can call" },
  { href: "/knowledge", label: "Knowledge",   icon: BookOpen,   hint: "Upload docs for retrieval" },
  { href: "/email",     label: "Email setup", icon: Mail,       hint: "IMAP + SMTP connector credentials" },
  { href: "/deploy",    label: "Deploy",      icon: Rocket,     hint: "Ship the agent process to your workflow engine" },
  { href: "/inbox",     label: "Inbox",       icon: Inbox,      hint: "Threads with full agent chat history" },
];

export default function Dashboard() {
  const [latest, setLatest] = useState<Deployment | null>(null);
  useEffect(() => {
    api<Deployment[]>("/deployments")
      .then((d) => setLatest(d[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h1 className="text-4xl font-semibold tracking-[-0.025em]">Overview</h1>
          {latest && (
            <Badge
              variant={
                latest.status === "deployed" ? "success" :
                latest.status === "failed" ? "destructive" : "secondary"
              }
            >
              <span className="mr-1.5 size-1.5 rounded-full bg-current opacity-70" />
              v{latest.version} · {latest.status}
            </Badge>
          )}
        </div>
        <p className="text-[15px] text-[var(--color-muted-foreground)] max-w-2xl leading-relaxed">
          Configure your email-driven AI agent and deploy it as a new process revision.
          Every change you save here ships as a versioned, isolated deployment for your tenant.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ href, label, icon: Icon, hint }, i) => (
          <Link key={href} href={href}>
            <article
              className={cn(
                "glass hairline group relative h-full overflow-hidden rounded-xl p-5 transition-all",
                "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-strong)]",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-[14px] font-medium tracking-tight">{label}</span>
                </div>
                <ArrowUpRight className="size-4 text-[var(--color-muted-foreground)] opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-3 text-[13px] text-[var(--color-muted-foreground)] leading-relaxed">{hint}</p>

              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--color-border-strong)] to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              />
              <span className="sr-only">{i}</span>
            </article>
          </Link>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium tracking-tight text-[var(--color-foreground)]">How it works</h2>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <article className="glass hairline rounded-xl p-6">
          <ol className="grid gap-4 sm:grid-cols-5">
            {[
              { n: "01", t: "Email arrives", d: "The inbound email connector polls your inbox over IMAP." },
              { n: "02", t: "Process starts", d: "A tenant-scoped BPMN instance kicks off." },
              { n: "03", t: "Agent reads", d: "AI Agent task applies your prompt, guardrails and tools." },
              { n: "04", t: "Action", d: "Search knowledge, call APIs, evaluate FEEL, or draft a reply." },
              { n: "05", t: "Reply + log", d: "SMTP sends the response; full thread lands in your Inbox." },
            ].map((s) => (
              <li key={s.n} className="space-y-1.5">
                <div className="font-mono text-[10px] tracking-wider text-[var(--color-muted-foreground)]">{s.n}</div>
                <div className="text-[13px] font-medium">{s.t}</div>
                <div className="text-[12px] text-[var(--color-muted-foreground)] leading-relaxed">{s.d}</div>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
