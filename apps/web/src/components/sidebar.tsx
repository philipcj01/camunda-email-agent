"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Inbox,
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
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-semibold tracking-tight text-[15px]">Sable</span>
        </Link>
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
                "group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-foreground)] font-medium"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/60",
              )}
            >
              <Icon className="size-3.5 opacity-80" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3.5">
          <p className="text-[11px] font-medium text-[var(--color-foreground)]">Email Agents</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            Each tenant runs an isolated process with the AI Agent connector.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-xl bg-[var(--color-foreground)] text-[var(--color-background)]",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-9.6 9.6" />
        <circle cx="7.5" cy="15.5" r="5.5" />
      </svg>
    </span>
  );
}
