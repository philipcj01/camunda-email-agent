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
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-6">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{me?.displayName ?? "—"}</span>
        <span className="text-xs text-[var(--color-muted-foreground)]">{me?.email ?? ""}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </header>
  );
}
