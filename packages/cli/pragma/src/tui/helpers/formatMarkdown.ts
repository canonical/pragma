import chalk from "chalk";

/**
 * Convert minimal Markdown to ANSI-styled text.
 *
 * Handles only the subset of Markdown commonly found in ontology
 * descriptions: bold, inline code, and bullet lists. No heading
 * parsing, no link rendering, no block-level structures beyond
 * paragraph separation.
 *
 * @param markdown - Raw Markdown text.
 * @returns ANSI-styled string suitable for terminal output.
 */
export default function formatMarkdown(markdown: string): string {
  return markdown
    .replace(/\*\*(.+?)\*\*/g, (_, text: string) => chalk.bold(text))
    .replace(/`(.+?)`/g, (_, text: string) => chalk.dim(text))
    .replace(/^- /gm, "• ");
}
