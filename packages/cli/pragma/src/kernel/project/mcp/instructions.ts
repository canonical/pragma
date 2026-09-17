/**
 * The MCP server `instructions` string — orientation sent ONCE in the
 * initialize handshake (not per tool call), so agents arrive oriented.
 *
 * A client may defer tools: the agent then sees only tool NAMES and this text
 * until it searches for a tool by name, so a description it never loads cannot
 * steer it. The instructions therefore carry a generated "question → tool"
 * index, built from the SAME `useWhen` each verb declares for its description:
 *
 * - the distribution's conventions, handed over as data (`mcpOrientation` —
 *   they name its tiers and nouns, so the kernel writes none of them);
 * - one line per read tool that is not part of a noun's list/lookup/sample
 *   trio, `tool — useWhen`;
 * - the trio explained ONCE, with the nouns that have each verb enumerated;
 * - the writes on one shared, plan-first line.
 *
 * Everything listed is derived from the registry: a new verb adds itself. Live
 * numbers (tier/channel/entity counts) are deliberately absent — they would
 * need a store boot at handshake.
 */

import type { CapabilityModule, VerbSpec } from "../../spec/index.js";
import { emitSurface, toolName } from "../../spec/index.js";

/**
 * HARD ceiling on the instructions length, unlike the catalogue budget: clients
 * cap server instructions at about 2 KB and cut the rest, so text past this is
 * text no agent reads. Fit by tightening sentences, never by raising it.
 */
export const INSTRUCTIONS_MAX_CHARS = 2000;

/** The verbs every read story compiles to; explained once rather than per noun. */
const TRIO = ["list", "lookup", "sample"] as const;

/** How most `useWhen` clauses open; the index says it once. */
const ASKED = /^when asked /;

/** Which of the trio a verb is, or nothing for a verb that stands alone. */
function trioVerbOf(verb: VerbSpec): (typeof TRIO)[number] | undefined {
  return TRIO.find((name) => verb.path[1] === name);
}

/**
 * Build the handshake orientation string from the live capability modules.
 *
 * The registry is not fixed — a project's packs add verbs at runtime — so the
 * text is FITTED, not merely measured: everything that is one line whatever the
 * registry holds comes first, the index comes last, and index lines are dropped
 * from the end until the whole fits, the last line saying how many were dropped
 * and where the full list is. A client would otherwise cut the tail silently.
 *
 * @param modules - The capability modules; the one declaring `mcpOrientation`
 *   supplies the conventions, the registry everything else.
 * @param onTruncate - Told how many index lines did not fit, when any did not.
 * @returns The orientation (≤ {@link INSTRUCTIONS_MAX_CHARS}); empty when no
 *   module declares one.
 */
export function buildInstructions(
  modules: readonly CapabilityModule[],
  onTruncate?: (dropped: number) => void,
): string {
  const orientation = modules.find(
    (module) => module.mcpOrientation,
  )?.mcpOrientation;
  if (!orientation) return "";
  const tools = modules
    .flatMap((module) => module.verbs)
    .filter((verb) => !verb.hidden && verb.capability.mcp.expose);
  const reads = tools.filter((verb) => !verb.capability.mutates);

  // The trio, once: every noun that has any of the three, marked for what it
  // has beyond `list` — a noun is never promised a verb it lacks.
  const has = (noun: string, name: (typeof TRIO)[number]): boolean =>
    reads.some((verb) => verb.path[0] === noun && trioVerbOf(verb) === name);
  const nouns = [
    ...new Set(reads.filter(trioVerbOf).map((verb) => verb.path[0])),
  ].map(
    (noun) =>
      `${noun}${has(noun, "lookup") ? "" : "†"}${has(noun, "sample") ? "*" : ""}`,
  );
  const writes = tools
    .filter((verb) => verb.capability.mutates)
    .map((verb) => toolName(verb.path))
    .join(", ");
  // The resource templates come from the emitted surface: the scheme is
  // declared by the module that serves it and frozen in the covenant.
  const templates = emitSurface(modules)
    .mcpSurface.resources.map((template) => `\`${template}\``)
    .join(", ");
  const fixed = [
    orientation.conventions.join(" "),
    "",
    `Per noun, <noun>_list finds entries and <noun>_lookup reads them by name († has no lookup); * also has <noun>_sample, which shows real data shapes: ${nouns.join(", ")}.`,
    `Writes are plan-first — the first call returns a plan; repeat it with confirm: true to apply: ${writes}.`,
    `Entity detail: read ${templates} resources.`,
    "",
  ];

  // The index. Verbs that read the store come first — they are the ones that
  // answer questions about the data — so what an overflow drops is the
  // administrative tail. A verb declaring no `useWhen` has no line to give.
  const standalone = reads
    .filter((verb) => !trioVerbOf(verb) && verb.useWhen)
    .sort(
      (a, b) =>
        Number(b.capability.needsStore) - Number(a.capability.needsStore),
    );
  // Most clauses open "when asked …"; saying that once, as a heading, is what
  // lets every question fit under the ceiling.
  const lineFor = (verb: VerbSpec): string =>
    `${toolName(verb.path)} — ${verb.useWhen?.replace(ASKED, "")}`;
  const group = (heading: string, verbs: readonly VerbSpec[]): string[] =>
    verbs.length > 0 ? [heading, ...verbs.map(lineFor)] : [];
  const index = [
    ...group(
      "When asked:",
      standalone.filter((verb) => ASKED.test(verb.useWhen ?? "")),
    ),
    ...group(
      "Also:",
      standalone.filter((verb) => !ASKED.test(verb.useWhen ?? "")),
    ),
  ];

  // Where the full list lives: the distribution's own orientation tool.
  const catalogue = tools.find((verb) => verb.category === "orientation");
  const render = (kept: number): string => {
    const dropped = index.length - kept;
    const more =
      dropped === 0
        ? []
        : [
            `… and ${dropped} more${catalogue ? `: call ${toolName(catalogue.path)}` : ""}.`,
          ];
    return [...fixed, ...index.slice(0, kept), ...more].join("\n");
  };
  let kept = index.length;
  while (kept > 0 && render(kept).length > INSTRUCTIONS_MAX_CHARS) kept--;
  if (kept < index.length) onTruncate?.(index.length - kept);
  return render(kept);
}
