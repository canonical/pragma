/**
 * Formatters for `graph inspect` — predicate/object groups, prefix-compacted.
 */

import { compactUri } from "../../kernel/render/compactUri.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { InspectResult } from "../../kernel/runtime/readEntity.js";
import type { Formatters } from "../../kernel/spec/types.js";

const compact = (value: string): string =>
  compactUri(value, DEFAULT_PREFIX_MAP);

export const inspectFormatters: Formatters<InspectResult> = {
  plain(data) {
    const title = data.label
      ? `${compact(data.uri)} — ${data.label}`
      : compact(data.uri);
    const lines = [title, "═".repeat(Math.max(title.length, 24)), ""];
    for (const group of data.groups) {
      lines.push(`  ${compact(group.predicate)}:`);
      for (const object of group.objects) lines.push(`    ${compact(object)}`);
    }
    return lines.join("\n").trimEnd();
  },
  llm(data) {
    const lines = [
      `## ${compact(data.uri)}${data.label ? ` — ${data.label}` : ""}`,
      "",
    ];
    for (const group of data.groups) {
      lines.push(
        `- **${compact(group.predicate)}**: ${group.objects.map(compact).join(", ")}`,
      );
    }
    return lines.join("\n").trimEnd();
  },
  json: (data) => JSON.stringify(data, null, 2),
};
