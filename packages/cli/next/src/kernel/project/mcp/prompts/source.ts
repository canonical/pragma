/**
 * The ONE source of truth for prompt entities — read TWO ways from ONE KG type
 * (`ds:Prompt`), so the native MCP `prompts/*` surface and the covenant
 * `prompt_list`/`prompt_lookup` content tools never diverge.
 *
 * A `ds:Prompt` is authored as:
 *   ds:prompt.x a ds:Prompt ;
 *     rdfs:label "x" ;                 # the prompt NAME (indexed → storeless list)
 *     rdfs:comment "…" ;               # the description (indexed)
 *     ds:promptBody "…" ;              # the template body (store-backed)
 *     ds:promptArgument [ ds:argName "a" ; rdfs:comment "…" ; ds:argRequired true ] .
 *
 * Listing is STORELESS (over the pack index — `label`/`description` are indexed),
 * so `prompts/list` and native discovery cost nothing until a `get`. A `get`
 * (body + arguments) is STORE-BACKED through the SPARQL facade — identical
 * laziness to the resource browser (list storeless, read store-backed). An empty
 * or missing index yields zero prompts (never a store boot on the list path).
 */

import { readPackIndex } from "../../../completion/entitySource.js";
import type { PragmaRuntime } from "../../../runtime/types.js";

/** The KG type (prefixed) every prompt entity carries. */
export const PROMPT_TYPE = "ds:Prompt";

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

/** Whether an index entity is a `ds:Prompt` (primary type or any type). */
function isPromptEntity(entity: {
  type: string;
  types?: readonly string[];
}): boolean {
  return (
    entity.type === PROMPT_TYPE ||
    (Array.isArray(entity.types) && entity.types.includes(PROMPT_TYPE))
  );
}

/**
 * List prompt summaries STORELESSLY from the active pack index. Returns `[]`
 * when no index is reachable or the index carries no prompts — never boots the
 * store.
 *
 * @param rt - The per-invocation runtime (for `cwd`).
 * @returns Prompt summaries (name from the entity label, sorted by name).
 */
export function listPromptSummaries(rt: PragmaRuntime): PromptSummary[] {
  const index = readPackIndex(rt.cwd);
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

/** Rows the prompt SELECT returns (one per argument; body repeats). */
interface PromptRow {
  readonly name?: { value?: string };
  readonly description?: { value?: string };
  readonly body?: { value?: string };
  readonly argName?: { value?: string };
  readonly argDescription?: { value?: string };
  readonly argRequired?: { value?: string };
}

/** The SPARQL that materializes prompts (all, or one when `label` is bound). */
function promptQuery(labelFilter?: string): string {
  const filter = labelFilter
    ? `  FILTER(LCASE(STR(?name)) = LCASE(${JSON.stringify(labelFilter)}))`
    : "";
  return [
    "SELECT ?name ?description ?body ?argName ?argDescription ?argRequired WHERE {",
    "  ?prompt a ds:Prompt ;",
    "          rdfs:label ?name .",
    filter,
    "  OPTIONAL { ?prompt rdfs:comment ?description }",
    "  OPTIONAL { ?prompt ds:promptBody ?body }",
    "  OPTIONAL {",
    "    ?prompt ds:promptArgument ?arg .",
    "    ?arg ds:argName ?argName .",
    "    OPTIONAL { ?arg rdfs:comment ?argDescription }",
    "    OPTIONAL { ?arg ds:argRequired ?argRequired }",
    "  }",
    "}",
    "ORDER BY ?name ?argName",
  ].join("\n");
}

/** Fold SELECT rows (one per argument) into distinct {@link PromptEntry}s. */
function foldPromptRows(rows: readonly PromptRow[]): PromptEntry[] {
  const byName = new Map<
    string,
    { description?: string; body: string; args: Map<string, PromptArgument> }
  >();
  for (const row of rows) {
    const name = row.name?.value;
    if (!name) continue;
    let entry = byName.get(name);
    if (!entry) {
      entry = { body: "", args: new Map() };
      if (row.description?.value) entry.description = row.description.value;
      byName.set(name, entry);
    }
    if (row.body?.value) entry.body = row.body.value;
    const argName = row.argName?.value;
    if (argName && !entry.args.has(argName)) {
      entry.args.set(argName, {
        name: argName,
        ...(row.argDescription?.value
          ? { description: row.argDescription.value }
          : {}),
        ...(row.argRequired
          ? { required: row.argRequired.value === "true" }
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

/** Extract the binding rows from a SPARQL select result, tolerating shapes. */
function selectRows(result: unknown): PromptRow[] {
  if (Array.isArray(result)) return result as PromptRow[];
  const bindings = (result as { results?: { bindings?: unknown } })?.results
    ?.bindings;
  return Array.isArray(bindings) ? (bindings as PromptRow[]) : [];
}

/**
 * Read every prompt entity STORE-BACKED (body + arguments). Boots the store via
 * the SPARQL facade; returns `[]` on any query failure (graceful degradation).
 *
 * @param rt - The per-invocation runtime.
 * @returns The materialized prompt entries, sorted by name.
 */
export async function readPrompts(rt: PragmaRuntime): Promise<PromptEntry[]> {
  try {
    const result = await rt.query.sparql(promptQuery());
    return foldPromptRows(selectRows(result));
  } catch {
    return [];
  }
}

/**
 * Read ONE prompt entity by name (case-insensitive), STORE-BACKED.
 *
 * @param rt - The per-invocation runtime.
 * @param name - The prompt name (its `rdfs:label`).
 * @returns The materialized prompt, or `undefined` when not found.
 */
export async function readPrompt(
  rt: PragmaRuntime,
  name: string,
): Promise<PromptEntry | undefined> {
  try {
    const result = await rt.query.sparql(promptQuery(name));
    return foldPromptRows(selectRows(result))[0];
  } catch {
    return undefined;
  }
}
