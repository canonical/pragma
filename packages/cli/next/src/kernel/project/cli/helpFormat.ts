/**
 * Shared help-rendering primitives — the ONE visual system every help page
 * composes from.
 *
 * Root help (`rootHelp.ts`), noun help, and verb help (`verbHelp.ts`) all build
 * their pages out of these helpers so the front door and the leaf pages read as
 * the same CLI: a dim `Usage:` label, bold section headers, a cyan-term /
 * dim-description two-column body, and a dim footer that points at the next help
 * level. chalk auto-disables color off a TTY, so goldens, piped output, and MCP
 * transports all capture plain text — only an interactive terminal gets color.
 */

import chalk from "chalk";

/** Two-space indent for every list body row. */
const INDENT = "  ";
/** Two-space gap between a term column and its description. */
const GAP = "  ";

/** A bold section header (`Flags`, `Verbs`, `Explore the design system`). */
export function helpHeading(text: string): string {
  return chalk.bold(text);
}

/** Dim secondary text — an example note, or the footer line. */
export function helpDim(text: string): string {
  return chalk.dim(text);
}

/** A cyan term — a command, verb, flag, or example, as shown in the body. */
export function helpTerm(text: string): string {
  return chalk.cyan(text);
}

/** The `Usage:` line: a dim label followed by the given command shape. */
export function helpUsage(body: string): string {
  return `${chalk.dim("Usage:")} ${body}`;
}

/**
 * Render aligned two-column rows: a cyan term padded to a common width, then its
 * dim description. Pass an explicit `width` to align across several lists (the
 * root's grouped sections share one column); omit it to size to these rows
 * alone.
 *
 * @param rows - `[term, description]` pairs.
 * @param width - Optional shared column width; defaults to the widest term.
 * @returns One formatted line per row.
 */
export function helpColumns(
  rows: readonly (readonly [term: string, description: string])[],
  width?: number,
): string[] {
  const column = width ?? Math.max(0, ...rows.map(([term]) => term.length));
  return rows.map(([term, description]) =>
    `${INDENT}${chalk.cyan(term.padEnd(column))}${GAP}${chalk.dim(description)}`.trimEnd(),
  );
}
