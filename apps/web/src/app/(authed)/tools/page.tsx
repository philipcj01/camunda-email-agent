"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  type FeelTool,
  type HttpTool,
  type Tool,
  type ToolParam,
} from "@sable/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type Draft = Tool;

const blankHttp = (): HttpTool => ({
  id: crypto.randomUUID(),
  name: "new_tool",
  description: "What this tool does",
  enabled: true,
  type: "http",
  params: [],
  http: { method: "POST", url: "https://api.example.com/endpoint", headers: {} },
});

const blankFeel = (): FeelTool => ({
  id: crypto.randomUUID(),
  name: "calc_total",
  description: "Compute something with FEEL",
  enabled: true,
  type: "feel",
  params: [],
  feel: { expression: "= sum([1,2,3])" },
});

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);

  useEffect(() => {
    api<Tool[]>("/tools").then(setTools).catch(console.error);
  }, []);

  async function save(t: Draft) {
    try {
      const saved = await api<Tool>("/tools", { method: "POST", body: JSON.stringify(t) });
      setTools((prev) => {
        const i = prev.findIndex((x) => x.id === saved.id);
        return i >= 0 ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
      });
      setEditing(null);
      toast.success(`Saved ${saved.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function remove(id: string) {
    await api(`/tools/${id}`, { method: "DELETE" });
    setTools((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tools</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            The agent&apos;s toolbox. HTTP tools call your APIs; FEEL tools evaluate deterministic
            expressions inside the workflow engine.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(blankFeel())}>
            <Plus className="size-4" /> FEEL tool
          </Button>
          <Button onClick={() => setEditing(blankHttp())}>
            <Plus className="size-4" /> HTTP tool
          </Button>
        </div>
      </header>

      {tools.length === 0 && !editing && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Wrench className="size-8 text-[var(--color-muted-foreground)]" />
            <CardTitle>No tools yet</CardTitle>
            <CardDescription>
              The agent already has built-in <code>search_knowledge</code> and <code>send_email</code> tools.
              Add custom HTTP or FEEL tools when you want it to call your own APIs or run domain logic.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {tools.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-sm">{t.name}</code>
                  <Badge variant={t.type === "http" ? "default" : "secondary"}>{t.type.toUpperCase()}</Badge>
                  {!t.enabled && <Badge variant="outline">disabled</Badge>}
                </CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(t)}>Edit</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {editing && (
        <ToolEditor
          tool={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ToolEditor({
  tool,
  onCancel,
  onSave,
}: {
  tool: Draft;
  onCancel: () => void;
  onSave: (t: Draft) => void;
}) {
  const [t, setT] = useState<Draft>(tool);

  const updateParam = (i: number, patch: Partial<ToolParam>) =>
    setT((c) => ({ ...c, params: c.params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const addParam = () =>
    setT((c) => ({
      ...c,
      params: [...c.params, { name: "param", description: "", type: "string", required: false }],
    }));
  const removeParam = (i: number) =>
    setT((c) => ({ ...c, params: c.params.filter((_, idx) => idx !== i) }));

  return (
    <Card className="border-[var(--color-primary)]">
      <CardHeader>
        <CardTitle>Edit tool</CardTitle>
        <CardDescription>
          Maps to the AI Agent connector&apos;s tool catalog at deploy time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name (snake_case)</Label>
            <Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Enabled</Label>
            <div className="flex h-9 items-center">
              <input
                type="checkbox"
                checked={t.enabled}
                onChange={(e) => setT({ ...t, enabled: e.target.checked })}
                className="size-4"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description (the agent reads this when deciding to call it)</Label>
          <Textarea
            rows={2}
            value={t.description}
            onChange={(e) => setT({ ...t, description: e.target.value })}
          />
        </div>

        {t.type === "http" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                  value={t.http.method}
                  onChange={(e) =>
                    setT({ ...t, http: { ...t.http, method: e.target.value as HttpTool["http"]["method"] } })
                  }
                >
                  {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label>URL</Label>
                <Input
                  value={t.http.url}
                  onChange={(e) => setT({ ...t, http: { ...t.http, url: e.target.value } })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Body template (FEEL or JSON with {`{{param}}`} placeholders)</Label>
              <Textarea
                rows={4}
                value={t.http.bodyTemplate ?? ""}
                onChange={(e) => setT({ ...t, http: { ...t.http, bodyTemplate: e.target.value } })}
                placeholder='{"customer": "{{customerId}}"}'
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>FEEL expression</Label>
            <Textarea
              rows={5}
              value={t.feel.expression}
              onChange={(e) => setT({ ...t, feel: { expression: e.target.value } })}
              placeholder='= "Hello " + name'
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Parameters (agent fills these when calling the tool)</Label>
            <Button variant="outline" size="sm" onClick={addParam}>
              <Plus className="size-3" /> Add param
            </Button>
          </div>
          {t.params.map((p, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-12 items-start rounded border border-[var(--color-border)] p-2">
              <Input className="sm:col-span-3" value={p.name} onChange={(e) => updateParam(i, { name: e.target.value })} placeholder="name" />
              <select
                className="sm:col-span-2 h-9 rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm"
                value={p.type}
                onChange={(e) => updateParam(i, { type: e.target.value as ToolParam["type"] })}
              >
                {(["string", "number", "boolean", "object", "array"] as const).map((tp) => (
                  <option key={tp} value={tp}>{tp}</option>
                ))}
              </select>
              <Input className="sm:col-span-5" value={p.description} onChange={(e) => updateParam(i, { description: e.target.value })} placeholder="description" />
              <label className="sm:col-span-1 flex items-center gap-1 text-xs">
                <input type="checkbox" checked={p.required} onChange={(e) => updateParam(i, { required: e.target.checked })} />
                req
              </label>
              <Button className="sm:col-span-1" variant="ghost" size="icon" onClick={() => removeParam(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <details className="rounded-lg border border-[var(--color-border)] p-3 text-xs text-[var(--color-muted-foreground)]">
          <summary className="cursor-pointer font-medium text-[var(--color-foreground)]">
            How this maps to the process
          </summary>
          <p className="mt-2">
            On deploy, this tool becomes a descriptor on the AI Agent task in your tenant&apos;s
            process. HTTP tools call your URL via the platform&apos;s REST connector; FEEL tools
            evaluate inside the workflow engine with no external call.
          </p>
        </details>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(t)}>Save tool</Button>
        </div>
      </CardContent>
    </Card>
  );
}
