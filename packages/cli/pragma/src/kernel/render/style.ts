/**
 * Terminal-styling seam for the human (TTY) output path.
 *
 * The condensed/agent (`llm`) and JSON paths are byte-frozen contracts; only an
 * interactive terminal earns color and alignment. A {@link RenderStyle} carries
 * that decision as data so a pure renderer can consult it without reading the
 * process itself: {@link defaultStyle} probes chalk's own TTY/env detection (the
 * same signal the help system leans on), so piped / redirected / MCP output —
 * where `enabled` is false — renders byte-for-byte as before, while an attended
 * terminal renders with `enabled: true`. Passing an explicit style keeps the
 * beautified renderers deterministically testable in both modes.
 */

import chalk from "chalk";

/** The palette + gate a renderer consults to beautify the human path. */
export interface RenderStyle {
  /** Whether to align + colorize — true only on a color-capable TTY. */
  readonly enabled: boolean;
  /** Emphasize a heading or primary label. */
  bold(text: string): string;
  /** De-emphasize secondary text (rules, markers, paths, punctuation). */
  dim(text: string): string;
  /** Highlight a value or identifier. */
  cyan(text: string): string;
  /** Tint a healthy / up-to-date status. */
  green(text: string): string;
  /** Tint a status that wants attention. */
  yellow(text: string): string;
}

/** The identity styler — every function returns its input unchanged. */
const PLAIN_STYLE: RenderStyle = {
  enabled: false,
  bold: (text) => text,
  dim: (text) => text,
  cyan: (text) => text,
  green: (text) => text,
  yellow: (text) => text,
};

/**
 * Build a {@link RenderStyle} for a known color decision.
 *
 * @param enabled - True to colorize + align via chalk; false for the identity
 *   styler (byte-identical to the pre-beautify plain output).
 * @returns A style whose functions color, or pass through, accordingly.
 */
export function styleFor(enabled: boolean): RenderStyle {
  if (!enabled) return PLAIN_STYLE;
  return {
    enabled: true,
    bold: (text) => chalk.bold(text),
    dim: (text) => chalk.dim(text),
    cyan: (text) => chalk.cyan(text),
    green: (text) => chalk.green(text),
    yellow: (text) => chalk.yellow(text),
  };
}

/**
 * Whether the environment forbids color outright.
 *
 * `NO_COLOR` is honored when PRESENT AND NON-EMPTY, whatever its value — an
 * empty assignment is explicitly not a request to disable (no-color.org). The
 * value is never parsed: `NO_COLOR=0` still disables, which surprises people
 * and is nonetheless what the convention says.
 *
 * @param env - The environment to read.
 * @returns True when color must not be emitted.
 */
export function forbidsColor(env: NodeJS.ProcessEnv): boolean {
  const value = env.NO_COLOR;
  return value !== undefined && value !== "";
}

// Applied to the SHARED chalk instance at module load, not inside
// `defaultStyle()`, because four modules reach for `chalk` directly rather than
// through `RenderStyle` — help formatting, doctor, upgrade and the colophon's
// Markdown renderer. Gating only the style seam would leave every one of them
// still emitting escapes. Zeroing the level once covers them by construction,
// including any site added later.
//
// This used to be delegated to chalk, and the delegation was silent: the
// vendored `supports-color` this version ships handles `FORCE_COLOR` and has no
// `NO_COLOR` branch at all, so the flag did nothing while the code asserted it
// worked.
if (forbidsColor(process.env)) chalk.level = 0;

/**
 * The active style for this process's stdout.
 *
 * Gated on BOTH signals: stdout must be an attended TTY, so piped / redirected /
 * MCP output stays byte-stable even where `supports-color` fires off a TTY (CI
 * sets `GITHUB_ACTIONS`, which chalk honors); AND chalk must report a usable
 * color level, which the module-load check above forces to zero under
 * `NO_COLOR`.
 *
 * @returns A colorizing style on a color-capable TTY, else the identity styler.
 * @note Impure — reads `process.stdout.isTTY` and chalk's color level.
 */
export function defaultStyle(): RenderStyle {
  return styleFor(process.stdout.isTTY === true && chalk.level > 0);
}
