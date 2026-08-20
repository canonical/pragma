/**
 * The ONE source of truth for prompt entities — read TWO ways from ONE KG type,
 * so the native MCP `prompts/*` surface and the covenant `prompt_list`/
 * `prompt_lookup` content tools never diverge.
 *
 * The type and its four properties are DECLARED by the distribution
 * (`kernel/vocabulary.ts`), not named here — this module knows the shape of a
 * prompt, not whose prompt it is. With `<type>`/`<body>`/`<argument>`/
 * `<argName>`/`<argRequired>` standing for the declared terms, a prompt entity
 * is authored as:
 *
 *   ex:prompt.x a <type> ;
 *     rdfs:label "x" ;               # the prompt NAME (indexed → storeless list)
 *     rdfs:comment "…" ;             # the description (indexed)
 *     <body> "…" ;                   # the template body (store-backed)
 *     <argument> [ <argName> "a" ; rdfs:comment "…" ; <argRequired> true ] .
 *
 * Listing is STORELESS (over the pack index — `label`/`description` are indexed),
 * so `prompts/list` and native discovery cost nothing until a `get`. A `get`
 * (body + arguments) is STORE-BACKED through `runSelect` — identical laziness to
 * the resource browser (list storeless, read store-backed). An empty or missing
 * index yields zero prompts (never a store boot on the list path).
 *
 * The store-backed reads route through `runSelect` and DO NOT catch. A cold
 * store is already refused upstream — the tools are `needsStore`, and the native
 * provider calls `guardStore()` first — so a swallowed failure here could only
 * ever hide a real one, reporting a broken query as an empty graph. `runSelect`
 * classifies an unbound prefix as STORE_UNAVAILABLE with its `sources update`
 * recovery and lets everything else propagate.
 */

import { readPackIndex } from "../../../completion/entitySource.js";
import { runSelect } from "../../../packs/sparql/runSelect.js";
import type { PackRow } from "../../../packs/types.js";
import { distributionSource } from "../../../packs/types.js";
import type { SourcesDecision } from "../../../runtime/resolveSources.js";
import type { PragmaRuntime } from "../../../runtime/types.js";
import { VOCABULARY } from "../../../vocabulary.js";

/** The declared prompt terms this module reads the graph with. */
const PROMPT = VOCABULARY.prompt;

/** One declared argument of a prompt template. */
export interface PromptArgument {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
}

/** A prompt as it appears in a listing (name + description only — storeless). */
export interface PromptSummary {
  readonly name: string;
  readonly description?: string;
}

/** A fully materialized prompt (body + arguments — store-backed). */
export interface PromptEntry extends PromptSummary {
  readonly body: string;
  readonly arguments: readonly PromptArgument[];
}

/** Whether an index entity carries the prompt type (primary type or any type). */
function isPromptEntity(entity: {
  type: string;
  types?: readonly string[];
}): boolean {
  return (
    entity.type === PROMPT.type ||
    (Array.isArray(entity.types) && entity.types.includes(PROMPT.type))
  );
}

/**
 * List prompt summaries STORELESSLY from the index of the pack the boot decision
 * names. Returns `[]` when no index is reachable (including an unavailable
 * store) or the index carries no prompts — never boots the store.
 *
 * @param decision - The boot decision from `resolveSources`.
 * @returns Prompt summaries (name from the entity label, sorted by name).
 */
export function listPromptSummaries(
  decision: SourcesDecision,
): PromptSummary[] {
  const index = readPackIndex(decision);
  if (!index || !Array.isArray(index.entities)) return [];
  const summaries: PromptSummary[] = [];
  for (const entity of index.entities) {
    if (!isPromptEntity(entity)) continue;
    const name = entity.label || entity.name;
    summaries.push({
      name,
      ...(entity.description ? { description: entity.description } : {}),
    });
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

/** The SPARQL that materializes prompts (all, or one when `label` is bound). */
function promptQuery(labelFilter?: string): string {
  const filter = labelFilter
    ? `  FILTER(LCASE(STR(?name)) = LCASE(${JSON.stringify(labelFilter)}))`
    : "";
  return [
    "SELECT ?name ?description ?body ?argName ?argDescription ?argRequired WHERE {",
    `  ?prompt a ${PROMPT.type} ;`,
    "          rdfs:label ?name .",
    filter,
    "  OPTIONAL { ?prompt rdfs:comment ?description }",
    `  OPTIONAL { ?prompt ${PROMPT.body} ?body }`,
    "  OPTIONAL {",
    `    ?prompt ${PROMPT.argument} ?arg .`,
    `    ?arg ${PROMPT.argName} ?argName .`,
    "    OPTIONAL { ?arg rdfs:comment ?argDescription }",
    `    OPTIONAL { ?arg ${PROMPT.argRequired} ?argRequired }`,
    "  }",
    "}",
    "ORDER BY ?name ?argName",
  ].join("\n");
}

/**
 * Fold SELECT rows (one per argument; the body repeats) into distinct
 * {@link PromptEntry}s. Rows are keyed by SELECT variable name with plain string
 * values, and an unbound OPTIONAL variable is simply absent.
 */
function foldPromptRows(rows: readonly PackRow[]): PromptEntry[] {
  const byName = new Map<
    string,
    { description?: string; body: string; args: Map<string, PromptArgument> }
  >();
  for (const row of rows) {
    const name = row.name;
    if (!name) continue;
    let entry = byName.get(name);
    if (!entry) {
      entry = { body: "", args: new Map() };
      if (row.description) entry.description = row.description;
      byName.set(name, entry);
    }
    if (row.body) entry.body = row.body;
    const argName = row.argName;
    if (argName && !entry.args.has(argName)) {
      entry.args.set(argName, {
        name: argName,
        ...(row.argDescription ? { description: row.argDescription } : {}),
        ...(row.argRequired !== undefined
          ? { required: row.argRequired === "true" }
          : {}),
      });
    }
  }
  return [...byName.entries()]
    .map(([name, entry]) => ({
      name,
      ...(entry.description ? { description: entry.description } : {}),
      body: entry.body,
      arguments: [...entry.args.values()],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Read every prompt entity STORE-BACKED (body + arguments).
 *
 * @param rt - The per-invocation runtime.
 * @returns The materialized prompt entries, sorted by name.
 * @throws PragmaError STORE_UNAVAILABLE when the store cannot answer; any other
 *   query failure propagates, so a broken read is never an empty graph.
 * @note Impure — boots the store through `runSelect`.
 */
export async function readPrompts(rt: PragmaRuntime): Promise<PromptEntry[]> {
  return foldPromptRows(
    await runSelect(rt, promptQuery(), distributionSource("prompt")),
  );
}

/**
 * Read ONE prompt entity by name (case-insensitive), STORE-BACKED.
 *
 * @param rt - The per-invocation runtime.
 * @param name - The prompt name (its `rdfs:label`).
 * @returns The materialized prompt, or `undefined` when the graph has no such
 *   prompt — a genuine miss, never a failed read.
 * @throws PragmaError STORE_UNAVAILABLE when the store cannot answer; any other
 *   query failure propagates.
 * @note Impure — boots the store through `runSelect`.
 */
export async function readPrompt(
  rt: PragmaRuntime,
  name: string,
): Promise<PromptEntry | undefined> {
  return foldPromptRows(
    await runSelect(rt, promptQuery(name), distributionSource("prompt")),
  ).at(0);
}
