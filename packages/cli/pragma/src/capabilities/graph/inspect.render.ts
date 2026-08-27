/**
 * Formatters for `graph inspect` — the entity's neighbourhood in three shapes.
 *
 * Terms arrive ALREADY compacted and named: the reader does it against the
 * store's own merged prefix map, which is the map the graph was actually built
 * with, so these formatters neither carry a prefix map nor re-derive one. They
 * choose between the forms the reader supplies and nothing more.
 */

import { toTurtle } from "../../kernel/render/turtle.js";
import type {
  InboundGroup,
  InspectResult,
  ReadTerm,
} from "../../kernel/runtime/readEntity.js";
import type { Formatters } from "../../kernel/spec/types.js";

/**
 * The prefix map the payload was already compacted against, recovered from the
 * terms themselves.
 *
 * A formatter has no store handle, and reaching for the compiled-in display map
 * would be a SECOND map: it can differ from the one the graph was built with,
 * and then the `@prefix` header would declare namespaces that disagree with the
 * names in the body. Every compacted term carries both halves, so the mapping is
 * already here — read it rather than fetch a rival copy.
 */
function prefixesOf(data: InspectResult): Record<string, string> {
  const prefixes: Record<string, string> = {};
  const learn = (term: ReadTerm): void => {
    if (term.termType !== "NamedNode" || !term.prefixed) return;
    const [prefix, ...rest] = term.prefixed.split(":");
    const local = rest.join(":");
    if (!prefix || !term.value.endsWith(local)) return;
    prefixes[prefix] = term.value.slice(0, term.value.length - local.length);
  };
  for (const group of data.groups) {
    learn(group.predicate);
    for (const object of group.objects) learn(object);
  }
  for (const group of data.inbound) {
    learn(group.predicate);
    for (const subject of group.subjects) learn(subject);
  }
  for (const records of Object.values(data.nested)) {
    for (const record of records)
      for (const value of Object.values(record)) learn(value);
  }
  return prefixes;
}

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
  /**
   * The agent-facing format IS Turtle — same bytes the `pragma:{+uri}` resource
   * read serves, which is what keeps the mirror contract meaningful now that the
   * two are no longer both JSON. Measured on one button: 15.8 KB of JSON against
   * 4.5 KB of Turtle for the same neighbourhood.
   *
   * `prefixes` comes from the reader, not from this formatter: it compacted the
   * terms against the store's own merged map, so re-deriving a map here could
   * only disagree with the names already in the payload.
   */
  llm: (data) => toTurtle(data, prefixesOf(data)),
  json: (data) => JSON.stringify(data, null, 2),
};
