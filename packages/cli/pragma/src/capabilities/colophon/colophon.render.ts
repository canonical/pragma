/**
 * Formatters for `pragma colophon` — plain (styled Markdown), llm (condensed
 * Markdown passthrough), json (the structured envelope). Pure and dependency-
 * light: the plain path routes through the `chalk`-only {@link
 * renderMarkdownToTerminal}; there is NO Ink here.
 *
 * The section title is composed as an H1 (`# <title>`) and fed through the ONE
 * styler, so all heading styling lives in a single place and the authored body
 * (which carries no leading H1) is never double-titled.
 *
 * The formatters render whatever sections the collector hands them and decide
 * nothing about which sections exist — that choice (the domain's story, or the
 * toolchain's when no domain tells one) belongs to the collector, and keeping
 * it there is what lets these stay pure.
 */

import { BIN_NAME } from "../../constants.js";
import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import type { Formatters } from "../../kernel/spec/types.js";
import { renderMarkdownToTerminal } from "./markdownTerminal.js";
import type { ColophonData, ColophonSection } from "./types.js";

/**
 * The zero-section empty state: nothing declares a colophon — no active pack,
 * and no story from the distribution itself. Blank output would read as a
 * broken command, so say what is missing and name the command that fixes it.
 * Like every empty state it goes to stderr with exit 0 (a calm success), so a
 * script reading stdout still reads nothing.
 */
const EMPTY_NOTICE = `No colophon declared. A colophon comes from an active pack — build the store with \`${BIN_NAME} sources update\`.`;

/** Render one section (title as H1 + body) as styled terminal Markdown. */
function plainSection(section: ColophonSection, style: RenderStyle): string {
  return renderMarkdownToTerminal(
    `# ${section.title}\n\n${section.markdown}`,
    style,
  );
}

/** Render one section as condensed Markdown for `--format llm` (summary preferred). */
function llmSection(section: ColophonSection): string {
  return `## ${section.title}\n\n${section.summary ?? section.markdown}`;
}

export const colophonFormatters: Formatters<ColophonData> = {
  plain(data) {
    // Resolve the TTY decision ONCE (impure: reads stdout.isTTY + chalk level),
    // then render every section through the same inert-off-a-TTY styler.
    const style = defaultStyle();
    return data.sections
      .map((section) => plainSection(section, style))
      .join("\n\n");
  },

  llm(data) {
    // llm returns before the dispatcher's empty-state routing, so the
    // condensed form carries its own zero-section line (the same shape the
    // other empty states use) rather than handing an agent zero bytes.
    if (data.sections.length === 0) return `_${EMPTY_NOTICE}_`;
    return data.sections.map(llmSection).join("\n\n");
  },

  json(data) {
    return JSON.stringify(data);
  },

  // Zero sections: the dispatcher routes this to stderr (exit 0) so plain
  // stdout stays empty; llm/json keep their own empty shapes.
  emptyNotice: (data) =>
    data.sections.length === 0 ? EMPTY_NOTICE : undefined,
};
