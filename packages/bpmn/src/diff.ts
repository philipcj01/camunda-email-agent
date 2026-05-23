/**
 * Produce a minimal unified-diff style string between two BPMN XML documents.
 * Kept dependency-free so this package stays light; the frontend uses a Monaco
 * diff viewer for the rich visualization.
 */
export function unifiedDiff(prev: string, next: string, context = 3): string {
  const a = prev.split(/\r?\n/);
  const b = next.split(/\r?\n/);
  const m = a.length;
  const n = b.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  type Op = { tag: "eq" | "add" | "del"; line: string };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ tag: "eq", line: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ tag: "del", line: a[i]! });
      i++;
    } else {
      ops.push({ tag: "add", line: b[j]! });
      j++;
    }
  }
  while (i < m) ops.push({ tag: "del", line: a[i++]! });
  while (j < n) ops.push({ tag: "add", line: b[j++]! });

  // Collapse runs of `eq` to `context` lines on each side of changes.
  const out: string[] = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.tag === "eq") {
      const nearChange =
        ops.slice(Math.max(0, k - context), k + context + 1).some((o) => o.tag !== "eq");
      if (nearChange) out.push(`  ${op.line}`);
      else if (out.length && out[out.length - 1] !== "  …") out.push("  …");
    } else if (op.tag === "add") {
      out.push(`+ ${op.line}`);
    } else {
      out.push(`- ${op.line}`);
    }
  }
  return out.join("\n");
}
