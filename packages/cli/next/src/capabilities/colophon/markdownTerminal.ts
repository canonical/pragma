/**
 * A tiny, self-contained Markdown→terminal styler — `chalk` only, no parser, no
 * new dependency. It covers exactly the constructs the colophon Markdown uses:
 * ATX headings, `-`/`*` bullets, fenced ```code``` blocks, and inline
 * `**bold**` / `` `code` `` spans. Deliberately minimal: no wrapping, no tables,
 * no nested lists.
 *
 * Single consumer today (`pragma colophon`); a promotion candidate to
 * `kernel/render/` if another verb ever wants the same helper. Determinism note:
 * styling routes through the shared {@link RenderStyle} seam (color only on a
 * color-capable TTY), so piped / redirected / CI output — where `supports-color`
 * can report a level with no TTY — stays byte-for-byte the color-free structural
 * transform, and a test can force either mode by passing an explicit style.
 */

import chalk from "chalk";
import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";

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

/**
 * Style inline `**bold**` and `` `code` `` spans within one line. The `**` / `` ` ``
 * markers are ALWAYS consumed; off a TTY the styler is inert, so the markers drop
 * with no color (byte-identical to the pre-seam `chalk.level = 0` behavior).
 */
function styleInline(text: string, style: RenderStyle): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, (_match, inner: string) => style.bold(inner))
    .replace(/`([^`]+)`/g, (_match, inner: string) => style.cyan(inner));
}

/**
 * Render a Markdown string to styled terminal text.
 *
 * @param markdown - The authored Markdown body.
 * @param style - The TTY styler; defaults to the process style. On a color-capable
 *   terminal headings/bullets/inline spans are tinted; off a TTY the styler is
 *   inert, so the output is byte-identical to the color-free structural form.
 * @returns The styled terminal string (no trailing newline).
 */
export function renderMarkdownToTerminal(
  markdown: string,
  style: RenderStyle = defaultStyle(),
): string {
  const lines: string[] = [];
  let inFence = false;

  for (const rawLine of markdown.split("\n")) {
    // Scrub pack-authored terminal control codes BEFORE our own styling
    // (colophon bodies are domain-as-data — never a channel for raw ANSI).
    const raw = stripControl(rawLine);
    // A fence toggles code mode; the ``` markers themselves are dropped.
    if (raw.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      lines.push(style.dim(`  ${raw}`));
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(raw);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      const text = styleInline(heading[2] ?? "", style);
      // H1 earns bold+underline on a TTY; underline is outside the RenderStyle
      // seam, so reach for chalk only when the styler is enabled.
      lines.push(
        level === 1 && style.enabled
          ? chalk.bold.underline(text)
          : style.bold(text),
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+(.+)$/.exec(raw);
    if (bullet) {
      lines.push(`  ${style.cyan("•")} ${styleInline(bullet[1] ?? "", style)}`);
      continue;
    }

    lines.push(styleInline(raw, style));
  }

  return lines.join("\n");
}
