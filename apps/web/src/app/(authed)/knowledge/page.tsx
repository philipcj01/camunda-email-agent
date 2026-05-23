"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import type { KnowledgeDoc, PresignedUploadResponse } from "@sable/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    api<KnowledgeDoc[]>("/knowledge").then(setDocs).catch(console.error);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function upload(file: File) {
    try {
      const presign = await api<PresignedUploadResponse>("/knowledge", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", sizeBytes: file.size }),
      });
      const form = new FormData();
      for (const [k, v] of Object.entries(presign.fields)) form.append(k, v);
      form.append("Content-Type", file.type || "application/octet-stream");
      form.append("file", file);
      const res = await fetch(presign.uploadUrl, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      toast.success(`Uploaded ${file.name}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) await upload(f);
  }

  async function remove(id: string) {
    await api(`/knowledge/${id}`, { method: "DELETE" });
    setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Knowledge</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Upload PDFs, markdown, or text files. They sync to a Bedrock Knowledge Base; the agent
          retrieves snippets via the <code>search_knowledge</code> tool.
        </p>
      </header>

      <Card
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={dragging ? "border-[var(--color-primary)] bg-[var(--color-accent)]" : ""}
      >
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <UploadCloud className="size-8 text-[var(--color-muted-foreground)]" />
          <CardTitle>Drop files to upload</CardTitle>
          <CardDescription>or click to select</CardDescription>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={async (e) => {
              const fs = Array.from(e.target.files ?? []);
              for (const f of fs) await upload(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>Select files</Button>
        </CardContent>
      </Card>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <BookOpen className="size-6 text-[var(--color-muted-foreground)]" />
            <CardDescription>No documents yet.</CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>{docs.length} file{docs.length === 1 ? "" : "s"} synced.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.filename}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {(d.size / 1024).toFixed(1)} KB · {new Date(d.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <Badge
                  variant={d.syncStatus === "ready" ? "success" : d.syncStatus === "failed" ? "destructive" : "secondary"}
                  className="mr-2"
                >
                  {d.syncStatus}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => remove(d.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
