const ENT: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export const xmlEscape = (s: string): string => s.replace(/[&<>"']/g, (c) => ENT[c]!);

export const indent = (lines: string[], spaces: number): string => {
  const pad = " ".repeat(spaces);
  return lines.map((l) => (l.length === 0 ? l : pad + l)).join("\n");
};
