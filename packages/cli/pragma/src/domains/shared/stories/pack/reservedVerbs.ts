/**
 * Per-(noun, verb) reservation for story packs.
 *
 * A story pack must not shadow a built-in command. The built-in surface is
 * derived at assembly time into a {@link ReservedVerbs} map via
 * {@link deriveReservedVerbs}: each built-in noun maps to the set of verbs it
 * already occupies. A pack is only blocked when it would emit a verb the
 * built-in noun actually owns — so a new verb on an existing noun is
 * admissible, and once a noun's `list`/`lookup` wrapper is deleted (leaf
 * cutover, ADR C.07) that verb automatically leaves the map, making the
 * migration incremental.
 *
 * Per-verb relaxation applies ONLY to nouns that own a `list`/`lookup` read
 * verb (the real leaf-migration targets: block/standard/modifier/token/tier).
 * A built-in noun that owns neither — an operational command like `config`,
 * `graph`, `setup` — is reserved wholesale by {@link deriveReservedVerbs}, so
 * a pack can never colonize its namespace.
 *
 * The {@link WHOLE_NOUN} sentinel (`"*"`) reserves a whole noun: single-word
 * built-ins (e.g. `info`, `llm`, `doctor`) have no verb, so they reserve every
 * verb, as do promoted operational nouns.
 * @module
 */

/** Sentinel verb reserving an entire noun (matches every verb). */
const WHOLE_NOUN = "*";

/**
 * The read-story verbs a pack can emit — the only verbs a leaf cutover frees.
 *
 * A built-in noun that owns one of these is a declarative-read migration
 * target and keeps per-verb reservation; a noun disjoint from this set is
 * operational and is reserved wholesale.
 */
const READ_STORY_VERBS: ReadonlySet<string> = new Set(["list", "lookup"]);

/**
 * Built-in reservations: noun → the verbs it occupies.
 *
 * The {@link WHOLE_NOUN} (`"*"`) sentinel in a noun's verb set reserves the
 * entire noun.
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
  return verbs !== undefined && (verbs.has(verb) || verbs.has(WHOLE_NOUN));
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
 * Pure grouping only — no reservation policy. A pair with an `undefined`
 * verb reserves the whole noun (stored as the {@link WHOLE_NOUN} sentinel).
 * A noun appearing with both a concrete verb and `undefined` keeps both
 * entries in its set, which is harmless because `"*"` already matches every
 * verb. Callers wanting the policy-applied surface use
 * {@link deriveReservedVerbs}, not this function.
 *
 * @param pairs - `(noun, verb)` pairs, e.g. from {@link nounVerbFromPath}.
 * @returns The assembled reservation map (raw grouping).
 */
export function buildReservedVerbs(
  pairs: Iterable<readonly [string, string | undefined]>,
): ReservedVerbs {
  const reserved = new Map<string, Set<string>>();
  for (const [noun, verb] of pairs) {
    const verbs = reserved.get(noun) ?? new Set<string>();
    verbs.add(verb ?? WHOLE_NOUN);
    reserved.set(noun, verbs);
  }
  return reserved;
}

/**
 * Derive the policy-applied {@link ReservedVerbs} the guard consumes.
 *
 * A built-in noun that exposes neither `list` nor `lookup` is an operational
 * command (config, graph, setup, …), never a declarative-read migration
 * target, so it is reserved wholesale — a pack may not colonize its
 * namespace. Nouns that own `list`/`lookup` keep per-verb reservation so a
 * later cutover phase can free an individual read verb by deleting its
 * wrapper.
 *
 * Both the CLI and MCP surfaces route through this single derivation, so the
 * two surfaces reserve the same `list`/`lookup` verbs for every leaf noun.
 *
 * Limitation: a fully-migrated leaf noun whose only *remaining* built-in
 * verbs are non-read (e.g. `sample`/`categories` after both `list` and
 * `lookup` are deleted) would be wholesale-promoted here; that Phase-3 case
 * is served by the built-in pack's own precedence (C.07) and must be
 * revisited when it lands.
 *
 * @param pairs - `(noun, verb)` pairs, e.g. from {@link nounVerbFromPath}.
 * @returns The reservation map with operational nouns promoted to whole-noun.
 */
export function deriveReservedVerbs(
  pairs: Iterable<readonly [string, string | undefined]>,
): ReservedVerbs {
  // Mutable working copy of the pure grouping.
  const map = new Map<string, Set<string>>();
  for (const [noun, verbs] of buildReservedVerbs(pairs)) {
    map.set(noun, new Set(verbs));
  }

  // Promote every operational noun (verb-set disjoint from the read verbs)
  // to a wholesale reservation. Bare nouns already hold `{"*"}`, so this is
  // idempotent for them; leaf read nouns keep their per-verb sets untouched.
  for (const [noun, verbs] of map) {
    const ownsReadVerb = [...verbs].some((verb) => READ_STORY_VERBS.has(verb));
    if (!ownsReadVerb) {
      map.set(noun, new Set([WHOLE_NOUN]));
    }
  }

  return map;
}
