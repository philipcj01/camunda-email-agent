"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Mail } from "lucide-react";
import type { Thread } from "@camunda-email-agent/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Page { items: Thread[]; cursor?: string }

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    api<Page>("/inbox/threads").then((p) => setThreads(p.items)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Every email your agent has handled, with the full chat history.
        </p>
      </header>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="size-8 text-[var(--color-muted-foreground)]" />
            <CardTitle>No messages yet</CardTitle>
            <CardDescription>
              Once you deploy the agent and an email arrives, it appears here.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {threads.map((t) => (
            <Link key={t.threadId} href={`/inbox/${encodeURIComponent(t.threadId)}`}>
              <Card className="transition-colors hover:border-[var(--color-primary)]">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-[var(--color-muted-foreground)]" />
                      <span className="truncate font-medium">{t.subject || "(no subject)"}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
                      {t.participants.map((p) => p.address).join(", ")}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3 text-right">
                    <Badge
                      variant={
                        t.status === "replied" ? "success" :
                        t.status === "awaiting_agent" ? "warning" :
                        t.status === "closed" ? "outline" : "secondary"
                      }
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                    <div className="w-32 text-xs text-[var(--color-muted-foreground)]">
                      {new Date(t.lastMessageAt).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
