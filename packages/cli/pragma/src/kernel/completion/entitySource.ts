/**
 * The dynamic-tier seam: where `{kind:"names"}` completions get their candidates
 * for EVERY object family, plus the storeless pack-index read the resource
 * browser (`info`, `doctor`, MCP prompts, the resource provider) shares.
 *
 * {@link indexCompletionEnv} is the one source-dispatched reader wired at the
 * `__complete` fast path (bin) and the `__complete` verb. It resolves three
 * storeless sources — all disk-readable, never a store/SPARQL:
 * - `index`    → the active pack's `index.json`, filtered by a prefixed `type`
 *                and read from the declared `field` (`name` by default).
 * - `skills`   → SKILL.md names via {@link discoverSkills} (filesystem walk).
 * - `prefixes` → the pack index's prefixes ∪ the default display prefixes.
 *
 * There is no per-family source. An entity family IS a `type` filter plus the
 * field that family is addressed by, and both are declared at the verb, so this
 * module names no entity type at all.
 *
 * The index is loaded once (lazy `readFileSync` + plain `JSON.parse` — never a
 * store, facade, config evaluator, or zod schema; any I/O or parse error
 * degrades to `[]`) and shared across the index and prefixes sources;
 * the skills walk is memoized to one walk per `__complete` process.
 * {@link createIndexEntityReader} exposes the index read for the storeless
 * behavioural/safety tests; {@link emptyNameSource} is the default (no names).
 *
 * {@link readPackIndex} and {@link entityTotal} expose the same storeless read
 * to `info`/`doctor` and the resource surfaces — but those callers are NOT on
 * the fast path, so `readPackIndex` takes the boot decision rather than
 * re-deriving one. Everything here relies only on the FROZEN `{ name, type }`
 * index minimum (plus optional enrichment like `label`/`altNames`), so the
 * index can grow without breaking completion.
 *
 * Storeless-graph notes:
 * - The embedded fallback is read from `pack.index.generated` — its OWN
 *   generated module (only the index string) — so the storeless `__complete`
 *   path never EVALUATES the n-quads/schema/manifest strings that live in
 *   `pack.generated`. It does not avoid parsing them: `bun build --compile`
 *   emits one script, so the whole embed is parsed at process start on every
 *   invocation (~+25 ms here, measured on `--version` against a toy-embed
 *   binary; BUDGETS.md records it). What the split buys is that a completion
 *   never allocates the 1.87 MB.
 * - The active pack is resolved through `kernel/runtime/paths` — a LEAF module
 *   (node builtins only) that shares the pointer read with `resolveSources`.
 *   `resolveSources` itself is unreachable from here: it pulls the graphpack
 *   manifest schema (zod), which `safety.test.ts` forbids on this graph, and
 *   `origins.packs` needs the config evaluator. So {@link loadActiveIndex}
 *   implements only the POINTER half of the decision table — pointer → that
 *   pack (else nothing), no pointer → the embedded snapshot. It cannot tell a
 *   fresh install from a project that declared its own packs and never built
 *   them, so a `__complete` in the latter still offers the snapshot's names.
 *   That is the price of a config-free fast path, and it is bounded to
 *   completion candidates: every read, and every surface that takes the
 *   decision, refuses. `PackIndex`/`PackIndexEntity` are imported type-only, so
 *   no zod schema is loaded at runtime.
 * - `discoverSkills` (`node:fs/os/path` only) and `DEFAULT_PREFIX_MAP` (whose
 *   domain half the distribution declares) are the only new edges — both
 *   leaf-clean, so the fast path stays free of boot/config/store/zod.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
// Inlined embedded index — its OWN generated module (only the index string), so
// the storeless `__complete` path never pulls the n-quads/schema/manifest
// strings that live in `pack.generated.ts`.
import { DEFAULT_PREFIX_MAP } from "../render/prefixes.js";
import { indexJson as EMBEDDED_INDEX_JSON } from "../runtime/graphpack/embedded/pack.index.generated.js";
import type { PackIndex, PackIndexEntity } from "../runtime/graphpack/types.js";
import { packDir, readActivePack } from "../runtime/paths.js";
import type { SourcesDecision } from "../runtime/resolveSources.js";
import { discoverSkills } from "../skills/discover.js";
import type { CompletionField, CompletionSourceRef } from "../spec/types.js";
import type { CompletionEnv } from "./types.js";

/** The default name source: no index tier, so no candidates. */
export const emptyNameSource: CompletionEnv["names"] = () => [];

/** The pack index filename (kept local so this path never imports the zod schema). */
const INDEX_FILE = "index.json";

/**
 * Read the storeless index of the pack the BOOT DECISION names — for `info`,
 * `doctor`, the MCP resource browser, and native `prompts/list`. Never boots the
 * store, never validates with zod — a plain `JSON.parse` off disk.
 *
 * It takes the decision rather than re-deriving one so these surfaces cannot
 * list entities the same project's reads refuse: `unavailable` yields
 * `undefined`, and callers degrade to a recovery hint (`buildResourceList`
 * emits the `pragma:sources` entry, `info` omits the total).
 *
 * @param decision - The boot decision from `resolveSources`.
 * @returns The answering pack's index, or `undefined` when none answers.
 */
export function readPackIndex(
  decision: SourcesDecision,
): PackIndex | undefined {
  switch (decision.kind) {
    case "pack":
      return readIndexFile(decision.dir);
    case "embedded":
      return parseIndex(EMBEDDED_INDEX_JSON);
    case "unavailable":
      return undefined;
  }
}

/**
 * Count a pack index's DISTINCT abox subjects — the "total entities" figure
 * `info` and `doctor` report. Works over any {@link PackIndex}, whether read
 * storelessly via {@link readPackIndex} or taken from a booted store session.
 *
 * NOT a sum of `instanceCountByType`: on a real OWL/Protégé export that raw
 * multiset double-counts — every individual is typed as both its domain class
 * AND `owl:NamedIndividual`, and the `owl:Class`/property meta-buckets pile on
 * top — so the total ran ~2× the real entity count (A1). Counting distinct
 * abox subjects (the individuals, each once) is the figure users expect; the
 * tbox schema classes/properties are not "entities" in this count.
 *
 * @param index - A pack index.
 * @returns The number of distinct abox subjects indexed.
 */
export function entityTotal(index: PackIndex): number {
  const subjects = new Set<string>();
  for (const entity of index.entities) {
    if (entity.box === "abox") subjects.add(entity.uri ?? entity.name);
  }
  return subjects.size;
}

/** Parse an index JSON string; any malformed input degrades to `undefined`. */
function parseIndex(json: string): PackIndex | undefined {
  try {
    return JSON.parse(json) as PackIndex;
  } catch {
    return undefined;
  }
}

/** Read a pack directory's `index.json`; any I/O or parse error is `undefined`. */
function readIndexFile(dir: string): PackIndex | undefined {
  try {
    return parseIndex(readFileSync(join(dir, INDEX_FILE), "utf-8"));
  } catch {
    return undefined;
  }
}

/**
 * The fast path's index — the POINTER half of the decision table (see the module
 * docblock). A project with a pointer reads that pack and nothing else: a
 * pointer whose pack the cache lost yields no candidates rather than the
 * snapshot's, which is what the boot decision does with the same state.
 */
function loadActiveIndex(cwd: string): PackIndex | undefined {
  const contentHash = readActivePack(cwd);
  return contentHash === undefined
    ? parseIndex(EMBEDDED_INDEX_JSON)
    : readIndexFile(packDir(contentHash));
}

/** Whether an entity matches a prefixed type filter (primary type or any type). */
function matchesType(entity: PackIndexEntity, type: string): boolean {
  if (!type) return true;
  if (entity.type === type) return true;
  return Array.isArray(entity.types) && entity.types.includes(type);
}

/**
 * Build a storeless entity-name reader for a working directory.
 *
 * @param cwd - The project directory (to resolve the active pack).
 * @returns `(type, partial) => string[]` — sorted entity names of `type`
 *   starting with `partial`. The index is loaded once, lazily, and reused.
 */
export function createIndexEntityReader(
  cwd: string,
): (type: string, partial: string) => string[] {
  let index: PackIndex | undefined;
  let loaded = false;
  return (type, partial) => {
    if (!loaded) {
      index = loadActiveIndex(cwd);
      loaded = true;
    }
    if (!index) return [];
    const names = new Set<string>();
    for (const entity of index.entities) {
      if (!matchesType(entity, type)) continue;
      if (partial && !entity.name.startsWith(partial)) continue;
      names.add(entity.name);
    }
    return [...names].sort();
  };
}

/**
 * One entity's completable tokens for a declared field, with NO fallback.
 *
 * A verb declares the field because that is the one its lookup matches on, so
 * an entity the pack did not enrich contributes nothing. Standing a label in
 * for an absent alt name would offer a token the lookup provably cannot resolve
 * — a completion that hands the user a value and then refuses it — which is the
 * complete-but-cannot-resolve split this whole declaration exists to close.
 * Offering nothing for an under-enriched entity is the honest answer.
 *
 * @param entity - One index entity.
 * @param field - The declared field to read.
 * @returns The tokens that entity contributes; empty when it carries none.
 */
function readEntityNames(
  entity: PackIndexEntity,
  field: CompletionField,
): readonly string[] {
  switch (field) {
    case "name":
      return [entity.name];
    case "label":
      return entity.label ? [entity.label] : [];
    case "altNames":
      return entity.altNames ?? [];
  }
}

/** A ref's candidates: entities of its type, read from its field, sorted. */
function indexNames(
  index: PackIndex | undefined,
  ref: CompletionSourceRef,
): string[] {
  if (!index) return [];
  const names = new Set<string>();
  for (const entity of index.entities) {
    if (!matchesType(entity, ref.type ?? "")) continue;
    for (const name of readEntityNames(entity, ref.field ?? "name")) {
      names.add(name);
    }
  }
  return [...names].sort();
}

/** The completable namespace prefixes: the index's ∪ the default display map. */
function prefixNames(index: PackIndex | undefined): string[] {
  const keys = new Set<string>(Object.keys(DEFAULT_PREFIX_MAP));
  if (index?.prefixes) {
    for (const key of Object.keys(index.prefixes)) keys.add(key);
  }
  return [...keys].sort();
}

/**
 * The completion environment for a working directory — the one source-dispatched
 * reader every name family shares. Wired at the `__complete` fast path (bin) and
 * the `__complete` verb; storeless throughout (see the module docblock).
 *
 * The pack index is loaded once, lazily, and reused across the index and
 * prefixes sources; the skills filesystem walk is memoized to one walk per
 * process (the design's perf caveat). Every source returns the FULL candidate
 * list in canonical casing — the resolver ranks/filters against the partial.
 *
 * @param cwd - The project directory (to resolve the active pack + skills).
 * @returns A {@link CompletionEnv} dispatching on {@link CompletionSourceRef}.
 */
export function indexCompletionEnv(cwd: string): CompletionEnv {
  let index: PackIndex | undefined;
  let indexLoaded = false;
  const getIndex = (): PackIndex | undefined => {
    if (!indexLoaded) {
      index = loadActiveIndex(cwd);
      indexLoaded = true;
    }
    return index;
  };
  let skills: readonly string[] | undefined;
  const getSkills = (): readonly string[] => {
    if (skills === undefined) skills = discoverSkills(cwd).map((s) => s.name);
    return skills;
  };
  return {
    names(ref: CompletionSourceRef): readonly string[] {
      switch (ref.from) {
        case "index":
          return indexNames(getIndex(), ref);
        case "skills":
          return getSkills();
        case "prefixes":
          return prefixNames(getIndex());
      }
    },
  };
}
