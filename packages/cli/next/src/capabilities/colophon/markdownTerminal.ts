/**
 * A tiny, self-contained Markdown→terminal styler — `chalk` only, no parser, no
 * new dependency. It covers exactly the constructs the colophon Markdown uses:
 * ATX headings, `-`/`*` bullets, fenced ```code``` blocks, and inline
 * `**bold**` / `` `code` `` spans. Deliberately minimal: no wrapping, no tables,
 * no nested lists.
 *
 * Single consumer today (`pragma colophon`); a promotion candidate to
 * `kernel/render/` if another verb ever wants the same helper. Determinism note:
 * styling routes entirely through `chalk`, so a test forcing `chalk.level = 0`
 * gets a stable, color-free snapshot of the structural transforms.
 */

import chalk from "chalk";

/** Full ANSI escape sequences (`ESC [ … final-letter`) — colour/cursor codes. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: deliberate control-char scrub
const ANSI_ESCAPE = /\x1b\[[0-9;]*[A-Za-z]/g;
/** Stray C0 control chars + DEL, keeping tab (`\x09`) and newline (`\x0a`). */
// biome-ignore lint/suspicious/noControlCharactersInRegex: deliberate control-char scrub
const C0_CONTROLS = /[\x00-\x08\x0b-\x1f\x7f]/g;

/**
 * Strip ANSI escape sequences and stray C0/DEL control characters from a line.
 *
 * The colophon body carries pack-authored domain text (the "domain-as-data"
 * model), so a hostile or careless pack could otherwise smuggle raw terminal
 * control codes — cursor moves, colour resets, screen clears — straight to the
 * terminal. We apply our OWN styling via `chalk` afterwards, so any control char
 * in the source is unwanted; scrub each line before styling.
 */
function stripControl(line: string): string {
  return line.replace(ANSI_ESCAPE, "").replace(C0_CONTROLS, "");
}

/** Style inline `**bold**` and `` `code` `` spans within one line. */
function styleInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, (_match, inner: string) => chalk.bold(inner))
    .replace(/`([^`]+)`/g, (_match, inner: string) => chalk.cyan(inner));
}

/**
 * Render a Markdown string to styled terminal text.
 *
 * @param markdown - The authored Markdown body.
 * @returns The chalk-styled terminal string (no trailing newline).
 */
export function renderMarkdownToTerminal(markdown: string): string {
  const lines: string[] = [];
  let inFence = false;

  for (const rawLine of markdown.split("\n")) {
    // Scrub pack-authored terminal control codes BEFORE our own chalk styling
    // (colophon bodies are domain-as-data — never a channel for raw ANSI).
    const raw = stripControl(rawLine);
    // A fence toggles code mode; the ``` markers themselves are dropped.
    if (raw.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      lines.push(chalk.dim(`  ${raw}`));
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(raw);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      const text = styleInline(heading[2] ?? "");
      lines.push(level === 1 ? chalk.bold.underline(text) : chalk.bold(text));
      continue;
    }

    const bullet = /^\s*[-*]\s+(.+)$/.exec(raw);
    if (bullet) {
      lines.push(`  ${chalk.cyan("•")} ${styleInline(bullet[1] ?? "")}`);
      continue;
    }

    lines.push(styleInline(raw));
  }

  return lines.join("\n");
}
