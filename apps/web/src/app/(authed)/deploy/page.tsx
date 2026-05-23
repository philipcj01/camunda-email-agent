"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Rocket, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { DeployPreview, DeploymentRecord } from "@camunda-email-agent/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function DeployPage() {
  const [preview, setPreview] = useState<DeployPreview | null>(null);
  const [history, setHistory] = useState<DeploymentRecord[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<DeploymentRecord[]>("/deployments").then(setHistory).catch(console.error);
    api<DeployPreview>("/deploy/preview", { method: "POST" }).then(setPreview).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    });
  }, []);

  async function refreshPreview() {
    setBusy(true);
    try {
      const p = await api<DeployPreview>("/deploy/preview", { method: "POST" });
      setPreview(p);
    } finally {
      setBusy(false);
    }
  }

  async function deploy() {
    setBusy(true);
    try {
      const r = await api<DeploymentRecord>("/deploy", { method: "POST" });
      toast.success(`Deployed v${r.version}`);
      setHistory((h) => [r, ...h]);
      await refreshPreview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Deploy</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Push your current configuration to Camunda 8 SaaS as a new BPMN version.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshPreview} disabled={busy}>Refresh preview</Button>
          <Button onClick={deploy} disabled={busy || !preview?.hasChanges}>
            <Rocket className="size-4" /> {preview?.hasChanges ? `Deploy v${preview.nextVersion}` : "No changes"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pending changes</CardTitle>
            <CardDescription>
              Diff between the last deployed BPMN and what will deploy next.
            </CardDescription>
          </div>
          {preview && (
            <Badge variant={preview.hasChanges ? "warning" : "success"}>
              {preview.hasChanges ? "Changes pending" : "Up to date"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {!preview ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading preview…</p>
          ) : !preview.hasChanges ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Your live process matches your saved configuration. No deploy needed.
            </p>
          ) : (
            <pre className="max-h-96 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-xs leading-relaxed">
              {preview.diff || "(initial deploy — full BPMN)"}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment history</CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">No deployments yet.</p>
          )}
          {history.map((d) => (
            <div key={d.version} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
              <div className="flex items-center gap-3">
                {d.status === "deployed" ? <CheckCircle2 className="size-4 text-emerald-500" /> :
                  d.status === "failed" ? <XCircle className="size-4 text-red-500" /> :
                  <Clock className="size-4 text-amber-500" />}
                <div>
                  <div className="font-medium">v{d.version}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {new Date(d.createdAt).toLocaleString()} · by {d.deployedBy}
                  </div>
                </div>
              </div>
              <Badge variant={d.status === "deployed" ? "success" : d.status === "failed" ? "destructive" : "secondary"}>
                {d.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
