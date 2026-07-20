/**
 * Formatters for `pragma colophon` — plain (styled Markdown), llm (condensed
 * Markdown passthrough), json (the structured envelope). Pure and dependency-
 * light: the plain path routes through the `chalk`-only {@link
 * renderMarkdownToTerminal}; there is NO Ink here.
 *
 * The section title is composed as an H1 (`# <title>`) and fed through the ONE
 * styler, so all heading styling lives in a single place and the authored body
 * (which carries no leading H1) is never double-titled.
 */

import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import type { Formatters } from "../../kernel/spec/types.js";
import { renderMarkdownToTerminal } from "./markdownTerminal.js";
import type { ColophonData, ColophonSection } from "./types.js";

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
    return data.sections.map(llmSection).join("\n\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
