"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Inbox, Mail, Rocket, Wrench, BookOpen, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Deployment { version: number; status: string; createdAt: string }

export default function Dashboard() {
  const [latest, setLatest] = useState<Deployment | null>(null);
  useEffect(() => {
    api<Deployment[]>("/deployments")
      .then((d) => setLatest(d[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  const tiles = [
    { href: "/agent", label: "AI Agent", icon: Bot, hint: "System prompt, guardrails, model" },
    { href: "/tools", label: "Tools", icon: Wrench, hint: "HTTP & FEEL tools the agent can call" },
    { href: "/knowledge", label: "Knowledge", icon: BookOpen, hint: "Upload docs for retrieval" },
    { href: "/email", label: "Email setup", icon: Mail, hint: "IMAP + SMTP connector creds" },
    { href: "/deploy", label: "Deploy", icon: Rocket, hint: "Ship process to Camunda 8" },
    { href: "/inbox", label: "Inbox", icon: Inbox, hint: "View threads + agent chat history" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Configure your email-driven AI agent and deploy it to Camunda 8 SaaS.
          </p>
        </div>
        {latest && (
          <Badge variant={latest.status === "deployed" ? "success" : latest.status === "failed" ? "destructive" : "secondary"}>
            v{latest.version} · {latest.status}
          </Badge>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ href, label, icon: Icon, hint }) => (
          <Link key={href} href={href}>
            <Card className="group transition-colors hover:border-[var(--color-primary)]">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--color-primary)]" />
                    {label}
                  </CardTitle>
                  <CardDescription>{hint}</CardDescription>
                </div>
                <ArrowUpRight className="size-4 text-[var(--color-muted-foreground)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How this works</CardTitle>
          <CardDescription>The shape of every per-tenant process you deploy.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          <ol className="list-decimal pl-5 space-y-2">
            <li>The Camunda <strong>Email connector</strong> polls your inbox over IMAP.</li>
            <li>A new email triggers a process instance for your tenant.</li>
            <li>The <strong>AI Agent</strong> task reads the email, your prompts and guardrails, and decides what to do.</li>
            <li>It can search your <strong>knowledge base</strong>, call your <strong>HTTP tools</strong>, evaluate <strong>FEEL expressions</strong>, or send a reply.</li>
            <li>Every step is captured in your <strong>Inbox</strong> here, alongside the message thread.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
