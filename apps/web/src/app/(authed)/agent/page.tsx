"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AgentConfigSchema,
  DEFAULT_AGENT_CONFIG,
  type AgentConfig,
  type Guardrail,
} from "@camunda-email-agent/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const MODELS = [
  "anthropic.claude-3-5-sonnet",
  "anthropic.claude-3-5-haiku",
  "anthropic.claude-3-opus",
  "openai.gpt-4o",
  "openai.gpt-4o-mini",
] as const;

export default function AgentPage() {
  const [cfg, setCfg] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<AgentConfig>("/agent").then(setCfg).catch(console.error);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const parsed = AgentConfigSchema.parse(cfg);
      const saved = await api<AgentConfig>("/agent", {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      setCfg(saved);
      toast.success("Agent configuration saved. Deploy to apply changes.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const addGuardrail = () =>
    setCfg((c) => ({
      ...c,
      guardrails: [
        ...c.guardrails,
        { id: crypto.randomUUID(), label: "New rule", instruction: "", enabled: true } as Guardrail,
      ],
    }));

  const updateGuardrail = (i: number, patch: Partial<Guardrail>) =>
    setCfg((c) => ({
      ...c,
      guardrails: c.guardrails.map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    }));

  const removeGuardrail = (i: number) =>
    setCfg((c) => ({ ...c, guardrails: c.guardrails.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">AI Agent</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          The personality, instructions, and constraints baked into your Camunda AI Agent task.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>System prompt</CardTitle>
          <CardDescription>
            The agent reads this first. Be specific about the role, audience, and what a great
            reply looks like.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={10}
            value={cfg.systemPrompt}
            onChange={(e) => setCfg({ ...cfg, systemPrompt: e.target.value })}
            placeholder="You are a helpful email assistant for ACME Corp customers..."
          />
          <div className="space-y-2">
            <Label>Persona / tone (optional)</Label>
            <Textarea
              rows={3}
              value={cfg.persona ?? ""}
              onChange={(e) => setCfg({ ...cfg, persona: e.target.value })}
              placeholder="Warm, concise, signs as 'The ACME Team'."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Guardrails</CardTitle>
            <CardDescription>
              Hard rules rendered into the system prompt as numbered constraints.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addGuardrail}>
            <Plus className="size-4" /> Add rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg.guardrails.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No guardrails yet. Add rules like &ldquo;Never share pricing&rdquo; or &ldquo;Always escalate refunds over $500&rdquo;.
            </p>
          )}
          {cfg.guardrails.map((g, i) => (
            <div key={g.id} className="flex gap-3 rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex-1 space-y-2">
                <Input
                  value={g.label}
                  onChange={(e) => updateGuardrail(i, { label: e.target.value })}
                  placeholder="Short label"
                />
                <Textarea
                  rows={2}
                  value={g.instruction}
                  onChange={(e) => updateGuardrail(i, { instruction: e.target.value })}
                  placeholder="Instruction the agent must follow"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeGuardrail(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Model and execution parameters.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Model</Label>
            <select
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              value={cfg.model}
              onChange={(e) => setCfg({ ...cfg, model: e.target.value as AgentConfig["model"] })}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={cfg.temperature}
              onChange={(e) => setCfg({ ...cfg, temperature: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max iterations</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={cfg.maxIterations}
              onChange={(e) => setCfg({ ...cfg, maxIterations: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pt-7">
            <input
              id="autoReply"
              type="checkbox"
              checked={cfg.autoReply}
              onChange={(e) => setCfg({ ...cfg, autoReply: e.target.checked })}
              className="size-4 rounded border-[var(--color-border)]"
            />
            <Label htmlFor="autoReply">Allow the agent to send replies automatically</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
