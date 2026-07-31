/**
 * Formatters for `pragma sources status` — plain, llm, json.
 */

import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import type { Formatters } from "../../kernel/spec/types.js";
import type { SourcesStatusData } from "./types.js";

/**
 * The headline for each boot decision. The `embedded` case names the update
 * explicitly: the distribution's snapshot answers reads, but it is a snapshot,
 * so reporting it as "up to date" would be a lie.
 */
const STORE_HEADLINE: Record<SourcesStatusData["store"], string> = {
  built: "ready",
  embedded:
    "embedded snapshot (run `pragma sources update` to build from the configured packs)",
  unavailable: "not built (run `pragma sources update`)",
};

/**
 * Render `sources status` as plain text.
 *
 * @param data - The resolved sources-status payload.
 * @param style - TTY styling; defaults to the process style. On a color-capable
 *   terminal the `Sources:` heading is bold, source names align into a column,
 *   and each configured ref is dimmed; off a TTY the styler is inert, so the
 *   output is byte-identical to the plain form.
 * @returns The formatted status block.
 */
export function renderSourcesStatusPlain(
  data: SourcesStatusData,
  style: RenderStyle = defaultStyle(),
): string {
  const lines = [`Store: ${STORE_HEADLINE[data.store]}`];
  if (data.contentHash !== null) {
    lines.push(
      `  pack: ${data.contentHash.slice(0, 12)} — ${data.entityCount ?? "?"} entities, built ${data.builtAt ?? "?"}`,
      `  from: ${data.sourceRef ?? "?"}`,
    );
  }
  lines.push("", style.enabled ? style.bold("Sources:") : "Sources:");
  if (data.sources.length === 0) {
    lines.push("  (none configured)");
  }
  const nameWidth = style.enabled
    ? Math.max(0, ...data.sources.map((source) => source.name.length))
    : 0;
  for (const source of data.sources) {
    lines.push(
      style.enabled
        ? `  ${source.name.padEnd(nameWidth)}  ${style.dim(source.ref)}`
        : `  ${source.name}  ${source.ref}`,
    );
  }
  return lines.join("\n");
}

export const statusFormatters: Formatters<SourcesStatusData> = {
  plain(data) {
    return renderSourcesStatusPlain(data);
  },

  llm(data) {
    const lines = [`# sources`, `- Store: ${data.store}`];
    if (data.sourceRef !== null) lines.push(`- From: ${data.sourceRef}`);
    if (data.entityCount !== null)
      lines.push(`- Entities: ${data.entityCount}`);
    for (const source of data.sources) {
      lines.push(`- ${source.name}: ${source.ref}`);
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
