/**
 * Formatters for `graph inspect` — the entity's neighbourhood in three shapes.
 *
 * Terms arrive ALREADY compacted and named: the reader does it against the
 * store's own merged prefix map, which is the map the graph was actually built
 * with, so these formatters neither carry a prefix map nor re-derive one. They
 * choose between the forms the reader supplies and nothing more.
 */

import type {
  InboundGroup,
  InspectResult,
  ReadTerm,
} from "../../kernel/runtime/readEntity.js";
import type { Formatters } from "../../kernel/spec/types.js";

/** The short form of a term: prefixed when there is one, else the raw value. */
const short = (term: ReadTerm): string => term.prefixed ?? term.value;

/** A term as a reader should see it — short form, with its name when known. */
const named = (term: ReadTerm): string =>
  term.title ? `${short(term)} (${term.title})` : short(term);

/**
 * `predicate (330, sample of 5)` — the count is the truth, the list is not.
 *
 * A roster and a truncated relation read differently on purpose: "sample of"
 * tells a reader that paging will not produce the rest and the noun's list verb
 * is where the full set lives, where "showing" invites them to ask for more.
 */
function inboundHeading(group: InboundGroup): string {
  if (group.sampled) {
    return `${short(group.predicate)} (${group.count}, sample of ${group.subjects.length})`;
  }
  const suffix = group.truncated
    ? `${group.count}, showing ${group.subjects.length}`
    : `${group.count}`;
  return `${short(group.predicate)} (${suffix})`;
}

export const inspectFormatters: Formatters<InspectResult> = {
  plain(data) {
    const title = data.label
      ? `${short({ termType: "NamedNode", value: data.uri, ...(data.prefixed ? { prefixed: data.prefixed } : {}) })} — ${data.label}`
      : (data.prefixed ?? data.uri);
    const lines = [title, "═".repeat(Math.max(title.length, 24)), ""];
    for (const group of data.groups) {
      lines.push(`  ${short(group.predicate)}:`);
      for (const object of group.objects) lines.push(`    ${named(object)}`);
    }
    for (const [via, rows] of Object.entries(data.nested)) {
      lines.push("", `  ${via}:`);
      for (const row of rows) {
        const fields = Object.entries(row)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join("  ");
        lines.push(`    ${fields}`);
      }
    }
    if (data.inbound.length > 0) {
      lines.push("", "  Referenced by:");
      for (const group of data.inbound) {
        lines.push(`    ${inboundHeading(group)}`);
        for (const subject of group.subjects) {
          lines.push(`      ${named(subject)}`);
        }
      }
    }
    return lines.join("\n").trimEnd();
  },
  llm(data) {
    const lines = [
      `## ${data.prefixed ?? data.uri}${data.label ? ` — ${data.label}` : ""}`,
      "",
    ];
    for (const group of data.groups) {
      lines.push(
        `- **${short(group.predicate)}**: ${group.objects.map(named).join(", ")}`,
      );
    }
    for (const [via, rows] of Object.entries(data.nested)) {
      lines.push("", `### ${via}`, "");
      for (const row of rows) {
        lines.push(
          `- ${Object.entries(row)
            .map(([key, value]) => `**${key}**: ${String(value)}`)
            .join(" · ")}`,
        );
      }
    }
    if (data.inbound.length > 0) {
      lines.push("", "### Referenced by", "");
      for (const group of data.inbound) {
        const subjects = group.subjects.map(named).join(", ");
        lines.push(
          `- **${inboundHeading(group)}**${subjects ? `: ${subjects}` : ""}`,
        );
      }
    }
    return lines.join("\n").trimEnd();
  },
  json: (data) => JSON.stringify(data, null, 2),
};
