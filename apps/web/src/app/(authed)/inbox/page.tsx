"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import type { Thread } from "@sable/shared";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Page { items: Thread[]; cursor?: string }

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    api<Page>("/inbox/threads").then((p) => setThreads(p.items)).catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-[-0.025em]">Inbox</h1>
        <p className="text-[15px] text-[var(--color-muted-foreground)] max-w-2xl">
          Every email your agent has handled, with the full chat history.
        </p>
      </header>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <Inbox className="size-4 text-[var(--color-muted-foreground)]" />
            </span>
            <CardTitle>No messages yet</CardTitle>
            <CardDescription className="max-w-sm">
              Once you deploy the agent and an email arrives, it appears here in real time.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--color-border)]">
            {threads.map((t) => (
              <li key={t.threadId}>
                <Link
                  href={`/inbox/${encodeURIComponent(t.threadId)}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--color-accent)]/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium tracking-tight">
                      {t.subject || "(no subject)"}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-[var(--color-muted-foreground)]">
                      {t.participants.map((p) => p.address).join(", ")}
                    </div>
                  </div>
                  <Badge
                    variant={
                      t.status === "replied" ? "success" :
                      t.status === "awaiting_agent" ? "warning" :
                      t.status === "closed" ? "outline" : "secondary"
                    }
                  >
                    {t.status.replace("_", " ")}
                  </Badge>
                  <div className="w-28 text-right text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                    {new Date(t.lastMessageAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
