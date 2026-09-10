/**
 * Formatters for `graph connect` — the same answer in two registers.
 *
 * A person gets one ROW PER STEP grouped by path, with each node's human name
 * from the pack index, because what a reader wants from "how do these two
 * connect" is the chain, read left to right, with the direction of every edge
 * visible.
 *
 * An agent gets ONE OBJECT. Not Markdown: the answer is structured data — two
 * endpoints, a verdict, the paths, and the policy the walk ran under — and
 * flattening it into prose would make a caller parse back out what it already
 * had (Constitution XI). This is also why neither format ever explains WHY two
 * things relate: the predicates on the path are the explanation, and a sentence
 * synthesised from them would be pragma asserting a meaning the graph does not
 * carry.
 *
 * Terms arrive already compacted and named by the relation index, against the
 * store's own merged prefix map — so these formatters carry no prefix map and
 * re-derive nothing.
 */

import type { Formatters } from "../../kernel/spec/index.js";
import type {
  ConnectPath,
  ConnectRefusal,
  ConnectResult,
  ConnectTerm,
  SharedRoster,
} from "./connect.types.js";

/** The short form of a term: prefixed when there is one, else the raw value. */
const short = (term: ConnectTerm): string => term.prefixed ?? term.value;

/** A term as a reader should see it — short form, with its name when known. */
const named = (term: ConnectTerm): string =>
  term.title ? `${short(term)} (${term.title})` : short(term);

/** A blank node has no address, and saying so beats printing a dead handle. */
const node = (term: ConnectTerm): string =>
  term.addressable === false ? `[record ${term.value}]` : named(term);

/** `1 hop` / `2 hops` — a count a reader does not have to forgive. */
const count = (n: number, noun: string): string =>
  `${n} ${noun}${n === 1 ? "" : "s"}`;

/** The sentence for each way of being unconnected — one per case, never shared. */
const REFUSALS: Readonly<Record<ConnectRefusal, string>> = {
  "endpoint-carries-no-relation":
    "Not connectable: one endpoint carries no relation the model uses — it is only classified.",
  "shares-only-rosters":
    "Not connected in the model. The two share membership, which is not a relation.",
  "no-path-within-hop-limit":
    "Not connected: no relation path between them within the hop limit.",
};

/** One roster group, as a line a reader can act on. */
function rosterLine(roster: SharedRoster): string {
  const shape =
    roster.side === "subjects"
      ? `${short(roster.predicate)} -> ${node(roster.node)}`
      : `${node(roster.node)} -> ${short(roster.predicate)}`;
  return `    ${shape}  (${roster.members} members)`;
}

/** One path, as a header plus one row per step. */
function pathLines(path: ConnectPath, ordinal: number): string[] {
  const lines = [`  Path ${ordinal} (${count(path.steps.length, "hop")})`];
  for (const step of path.steps) {
    const arrow =
      step.direction === "forward"
        ? `--${short(step.predicate)}->`
        : `<-${short(step.predicate)}--`;
    lines.push(`    ${node(step.from)}  ${arrow}  ${node(step.to)}`);
  }
  return lines;
}

/** The policy block every answer carries, positive or negative. */
function policyLines(data: ConnectResult): string[] {
  return [
    "",
    `  Hop limit ${data.hopLimit}; edges whose fan-in exceeds ${data.rosterThreshold} are rosters, not relations.`,
    `  Packs searched: ${data.packs.length > 0 ? data.packs.join(", ") : "none recorded"}`,
  ];
}

export const connectFormatters: Formatters<ConnectResult> = {
  plain(data) {
    const title = `${node(data.a.term)}  <->  ${node(data.b.term)}`;
    const lines = [title, "=".repeat(Math.min(Math.max(title.length, 24), 96))];

    if (data.connected) {
      lines.push(
        `  Connected in ${count(data.hops ?? 0, "relation hop")}, by ${count(data.pathCount, "shortest path")}.`,
        "",
      );
      for (const [index, path] of data.paths.entries()) {
        lines.push(...pathLines(path, index + 1));
        lines.push("");
      }
      if (data.truncated) {
        lines.push(
          `  Showing ${data.paths.length} of ${data.pathCount} shortest paths — raise --paths for the rest.`,
        );
      }
    } else {
      lines.push(
        `  ${REFUSALS[data.unconnectedBecause ?? "no-path-within-hop-limit"]}`,
      );
      for (const endpoint of [data.a, data.b]) {
        if (endpoint.relatable) continue;
        lines.push(
          "",
          `  ${node(endpoint.term)} carries no relation. It is classified by:`,
          ...(endpoint.classifiedBy ?? []).map(rosterLine),
        );
      }
      if (data.sharedRosters.length > 0) {
        lines.push("", "  Rosters they both belong to:");
        lines.push(...data.sharedRosters.map(rosterLine));
        lines.push(
          "",
          "  A roster is answered by the noun's own list verb, not by a path.",
        );
      }
    }

    lines.push(...policyLines(data));
    return lines.join("\n").trimEnd();
  },

  /**
   * The agent-facing format IS the object — one JSON value on one line.
   *
   * `json` pretty-prints the same payload for a human reading a pipe; the two
   * are the same data by construction, so an agent and a reader never see
   * different answers to the same question.
   */
  llm: (data) => JSON.stringify(data),
  json: (data) => JSON.stringify(data, null, 2),
};
