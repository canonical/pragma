/**
 * Formatters for `pragma sources status` — plain, llm, json.
 */

import { defaultStyle, type RenderStyle } from "../../kernel/render/style.js";
import type { Formatters } from "../../kernel/spec/types.js";
import type { SourcesStatusData } from "./types.js";

const STALENESS_MARK: Record<string, string> = {
  "up-to-date": "ok",
  "config-drift": "config drift",
  uncached: "not built",
};

/**
 * Render `sources status` as plain text.
 *
 * @param data - The resolved sources-status payload.
 * @param style - TTY styling; defaults to the process style. On a color-capable
 *   terminal the `Sources:` heading is bold, source names align into a column,
 *   and each staleness marker is tinted (green up-to-date, else yellow); off a
 *   TTY the styler is inert, so the output is byte-identical to the plain form.
 * @returns The formatted status block.
 */
export function renderSourcesStatusPlain(
  data: SourcesStatusData,
  style: RenderStyle = defaultStyle(),
): string {
  const lines = [
    data.lockPresent
      ? `Store: ${data.cached ? "ready" : "locked but not cached"}`
      : "Store: no lock (run `pragma sources update`)",
  ];
  if (data.cached) {
    lines.push(
      `  pack: ${data.contentHash?.slice(0, 12)} — ${data.entityCount ?? "?"} entities, built ${data.builtAt ?? "?"}`,
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
    const mark = STALENESS_MARK[source.staleness] ?? source.staleness;
    const resolved = source.resolved
      ? ` @ ${source.resolved.slice(0, 12)}`
      : "";
    if (!style.enabled) {
      lines.push(`  ${source.name} [${mark}]${resolved}`);
      continue;
    }
    const tint = source.staleness === "up-to-date" ? style.green : style.yellow;
    lines.push(
      `  ${source.name.padEnd(nameWidth)}  ${tint(`[${mark}]`)}${style.dim(resolved)}`,
    );
  }
  return lines.join("\n");
}

export const statusFormatters: Formatters<SourcesStatusData> = {
  plain(data) {
    return renderSourcesStatusPlain(data);
  },

  llm(data) {
    const lines = [
      `# sources`,
      `- Store: ${data.lockPresent ? (data.cached ? "ready" : "locked, not cached") : "no lock"}`,
      ...(data.cached ? [`- Entities: ${data.entityCount ?? "?"}`] : []),
    ];
    for (const source of data.sources) {
      lines.push(`- ${source.name}: ${source.staleness}`);
    }
    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data);
  },
};
