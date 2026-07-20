/**
 * Pull the runnable `pragma` command lines out of a Markdown document.
 *
 * Scans fenced `bash` / `sh` / `console` blocks, strips a leading shell prompt
 * (`$ `), and keeps the lines that invoke `pragma`. Used by the doc-example
 * tests to prove every command shown in the docs is real grammar and — for the
 * curated read set — actually runs.
 */

/** Fenced `bash`/`sh`/`console` blocks, capturing the body between the fences. */
const FENCE_RE = /```(?:bash|sh|console)\r?\n(?<body>[\s\S]*?)```/g;

/**
 * Extract every `pragma …` command line from a Markdown string.
 *
 * @param markdown - The Markdown source to scan.
 * @returns The `pragma` command lines, in document order, prompt-stripped.
 */
export function extractPragmaCommands(markdown: string): string[] {
  const commands: string[] = [];
  for (const match of markdown.matchAll(FENCE_RE)) {
    const body = match.groups?.body ?? "";
    for (const rawLine of body.split("\n")) {
      const line = rawLine.replace(/^\s*\$\s+/, "").trim();
      if (line.startsWith("pragma ")) commands.push(line);
    }
  }
  return commands;
}
