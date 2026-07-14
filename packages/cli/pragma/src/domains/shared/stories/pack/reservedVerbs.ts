/**
 * Per-(noun, verb) reservation for story packs.
 *
 * A story pack must not shadow a built-in command. The built-in surface is
 * derived at assembly time into a {@link ReservedVerbs} map: each built-in
 * noun maps to the set of verbs it already occupies. A pack is only blocked
 * when it would emit a verb the built-in noun actually owns — so a new verb
 * on an existing noun is admissible, and once a noun's `list`/`lookup`
 * wrapper is deleted (leaf cutover, ADR C.07) that verb automatically
 * leaves the map, making the migration incremental.
 *
 * The sentinel `"*"` reserves a whole noun: single-word built-ins (e.g.
 * `info`, `llm`, `doctor`) have no verb, so they reserve every verb.
 * @module
 */

/**
 * Built-in reservations: noun → the verbs it occupies.
 *
 * The `"*"` sentinel in a noun's verb set reserves the entire noun.
 */
export type ReservedVerbs = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Whether a `(noun, verb)` pair is reserved by a built-in command.
 *
 * @param reserved - The assembled reservation map.
 * @param noun - The story pack noun.
 * @param verb - A verb the pack would emit (e.g. `"list"`).
 * @returns `true` when the noun reserves this verb or the whole noun (`"*"`).
 */
export function isReserved(
  reserved: ReservedVerbs,
  noun: string,
  verb: string,
): boolean {
  const verbs = reserved.get(noun);
  return verbs !== undefined && (verbs.has(verb) || verbs.has("*"));
}

/**
 * Split a CLI command path into a `(noun, verb)` pair.
 *
 * `["standard", "list"]` → `["standard", "list"]`; a single-segment path
 * like `["info"]` → `["info", undefined]` (whole-noun reservation).
 *
 * @param path - A command's path segments.
 * @returns The `[noun, verb]` pair; `verb` is `undefined` for a bare noun.
 */
export function nounVerbFromPath(
  path: readonly string[],
): [string, string | undefined] {
  return [path.at(0) ?? "", path.at(1)];
}

/**
 * Split an MCP tool name into a `(noun, verb)` pair on `"_"`.
 *
 * The verb keeps every segment after the first, so the one multi-underscore
 * built-in parses as `"tokens_add_config"` → `["tokens", "add_config"]`;
 * `"standard_list"` → `["standard", "list"]`; a bare `"info"` →
 * `["info", undefined]`.
 *
 * Note the surface asymmetry this tolerates: the CLI reserves `tokens
 * add-config` (hyphen) while MCP reserves `tokens_add_config` (underscore),
 * and CLI/MCP reserve different noun sets overall. That is harmless — each
 * surface derives and consumes its own map, and packs only ever emit the
 * `list`/`lookup` verbs.
 *
 * @param name - An MCP tool name (e.g. `"token_lookup"`).
 * @returns The `[noun, verb]` pair; `verb` is `undefined` for a bare noun.
 */
export function nounVerbFromToolName(
  name: string,
): [string, string | undefined] {
  const parts = name.split("_");
  const noun = parts.at(0) ?? "";
  const verb = parts.length > 1 ? parts.slice(1).join("_") : undefined;
  return [noun, verb];
}

/**
 * Assemble a {@link ReservedVerbs} map from `(noun, verb)` pairs.
 *
 * A pair with an `undefined` verb reserves the whole noun (stored as the
 * `"*"` sentinel). A noun appearing with both a concrete verb and
 * `undefined` keeps both entries in its set, which is harmless because
 * `"*"` already matches every verb.
 *
 * @param pairs - `(noun, verb)` pairs, e.g. from {@link nounVerbFromPath}.
 * @returns The assembled reservation map.
 */
export function buildReservedVerbs(
  pairs: Iterable<readonly [string, string | undefined]>,
): ReservedVerbs {
  const reserved = new Map<string, Set<string>>();
  for (const [noun, verb] of pairs) {
    const verbs = reserved.get(noun) ?? new Set<string>();
    verbs.add(verb ?? "*");
    reserved.set(noun, verbs);
  }
  return reserved;
}
