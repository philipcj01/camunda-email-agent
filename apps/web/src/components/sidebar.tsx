"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Mail,
  Rocket,
  Wrench,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/agent", label: "AI Agent", icon: Bot },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/email", label: "Email setup", icon: Mail },
  { href: "/deploy", label: "Deploy", icon: Rocket },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="flex h-14 items-center px-5 border-b border-[var(--color-border)]">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <KeyRound className="size-4 text-[var(--color-primary)]" />
          Email Agent
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]",
              )}
            >
              <Icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
