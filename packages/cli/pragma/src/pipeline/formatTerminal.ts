/**
 * Terminal formatting helpers for CLI output.
 *
 * Pure string transformers that apply chalk styling
 * for headings, fields, lists, and sections.
 */

import chalk from "chalk";

/**
 * Format text as a bold underlined heading.
 *
 * @param text - Heading content.
 * @returns Styled string.
 */
function formatHeading(text: string): string {
  return chalk.bold.underline(text);
}

/**
 * Format a label–value pair with a dimmed label.
 *
 * @param label - Field label (rendered dim).
 * @param value - Field value.
 * @returns Styled `"label value"` string.
 */
function formatField(label: string, value: string): string {
  return `${chalk.dim(label)} ${value}`;
}

/**
 * Format an array of items as a bulleted list.
 *
 * @param items - Lines to render.
 * @param bullet - Bullet character (default `"-"`).
 * @returns Multi-line bulleted string.
 */
function formatList(items: string[], bullet = "-"): string {
  return items.map((item) => `  ${bullet} ${item}`).join("\n");
}

/**
 * Combine a heading and a body block into a section.
 *
 * @param heading - Section heading text.
 * @param body - Pre-formatted body content.
 * @returns Heading followed by body, separated by a newline.
 */
function formatSection(heading: string, body: string): string {
  return `${formatHeading(heading)}\n${body}`;
}

export { formatField, formatHeading, formatList, formatSection };
