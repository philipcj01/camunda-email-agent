"use client";
import { useEffect, useState } from "react";
import { signOut } from "aws-amplify/auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Me {
  displayName: string;
  email: string;
}

export function Topbar() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api<Me>("/me").then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-strong)] px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 dark:from-zinc-700 dark:to-zinc-900 ring-1 ring-[var(--color-border)]" />
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-medium">{me?.displayName ?? "—"}</span>
          <span className="text-[11px] text-[var(--color-muted-foreground)]">{me?.email ?? ""}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        <LogOut className="size-3.5" /> Sign out
      </Button>
    </header>
  );
}
