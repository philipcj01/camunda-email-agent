"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { EmailConfigInput } from "@sable/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ServerEmailConfig {
  inbound: { host: string; port: number; secure: boolean; username: string; folder: string; pollIntervalSeconds: number; passwordSet: boolean };
  outbound: { host: string; port: number; secure: boolean; username: string; fromAddress: string; fromName?: string; passwordSet: boolean };
}

const emptyInbound = { host: "imap.gmail.com", port: 993, secure: true, username: "", folder: "INBOX", pollIntervalSeconds: 60, passwordSet: false };
const emptyOutbound = { host: "smtp.gmail.com", port: 587, secure: false, username: "", fromAddress: "", fromName: "", passwordSet: false };

export default function EmailPage() {
  const [cfg, setCfg] = useState<ServerEmailConfig>({ inbound: emptyInbound, outbound: emptyOutbound });
  const [inboundPwd, setInboundPwd] = useState("");
  const [outboundPwd, setOutboundPwd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<ServerEmailConfig | null>("/email-config").then((c) => {
      if (c) setCfg(c);
    }).catch(console.error);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const input: EmailConfigInput = {
        inbound: {
          host: cfg.inbound.host,
          port: cfg.inbound.port,
          secure: cfg.inbound.secure,
          username: cfg.inbound.username,
          folder: cfg.inbound.folder,
          pollIntervalSeconds: cfg.inbound.pollIntervalSeconds,
          ...(inboundPwd ? { password: inboundPwd } : {}),
        },
        outbound: {
          host: cfg.outbound.host,
          port: cfg.outbound.port,
          secure: cfg.outbound.secure,
          username: cfg.outbound.username,
          fromAddress: cfg.outbound.fromAddress,
          fromName: cfg.outbound.fromName,
          ...(outboundPwd ? { password: outboundPwd } : {}),
        },
      };
      await api("/email-config", { method: "PUT", body: JSON.stringify(input) });
      toast.success("Email configuration saved. Deploy to apply.");
      setInboundPwd("");
      setOutboundPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Email connector</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          IMAP credentials for inbound mail, SMTP for replies. Passwords are stored in AWS Secrets
          Manager and never returned to the browser — only referenced by your process at runtime.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inbound (IMAP)</CardTitle>
          <CardDescription>Where the inbound connector polls for new email.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Host" value={cfg.inbound.host} onChange={(v) => setCfg({ ...cfg, inbound: { ...cfg.inbound, host: v } })} />
          <Field label="Port" type="number" value={String(cfg.inbound.port)} onChange={(v) => setCfg({ ...cfg, inbound: { ...cfg.inbound, port: Number(v) } })} />
          <Field label="Username" value={cfg.inbound.username} onChange={(v) => setCfg({ ...cfg, inbound: { ...cfg.inbound, username: v } })} />
          <PasswordField
            label="Password"
            placeholderStored={cfg.inbound.passwordSet}
            value={inboundPwd}
            onChange={setInboundPwd}
          />
          <Field label="Folder" value={cfg.inbound.folder} onChange={(v) => setCfg({ ...cfg, inbound: { ...cfg.inbound, folder: v } })} />
          <Field label="Poll interval (sec)" type="number" value={String(cfg.inbound.pollIntervalSeconds)} onChange={(v) => setCfg({ ...cfg, inbound: { ...cfg.inbound, pollIntervalSeconds: Number(v) } })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outbound (SMTP)</CardTitle>
          <CardDescription>How the agent sends replies.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Host" value={cfg.outbound.host} onChange={(v) => setCfg({ ...cfg, outbound: { ...cfg.outbound, host: v } })} />
          <Field label="Port" type="number" value={String(cfg.outbound.port)} onChange={(v) => setCfg({ ...cfg, outbound: { ...cfg.outbound, port: Number(v) } })} />
          <Field label="Username" value={cfg.outbound.username} onChange={(v) => setCfg({ ...cfg, outbound: { ...cfg.outbound, username: v } })} />
          <PasswordField
            label="Password"
            placeholderStored={cfg.outbound.passwordSet}
            value={outboundPwd}
            onChange={setOutboundPwd}
          />
          <Field label="From address" type="email" value={cfg.outbound.fromAddress} onChange={(v) => setCfg({ ...cfg, outbound: { ...cfg.outbound, fromAddress: v } })} />
          <Field label="From name" value={cfg.outbound.fromName ?? ""} onChange={(v) => setCfg({ ...cfg, outbound: { ...cfg.outbound, fromName: v } })} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <ShieldCheck className="size-4" /> Passwords are encrypted at rest in AWS Secrets Manager.
        </p>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PasswordField({
  label, value, onChange, placeholderStored,
}: { label: string; value: string; onChange: (v: string) => void; placeholderStored: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderStored ? "•••••••• (stored, leave blank to keep)" : "Enter password"}
      />
    </div>
  );
}
