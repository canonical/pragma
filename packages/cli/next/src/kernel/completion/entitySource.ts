/**
 * The dynamic-tier seam: where `{kind:"names"}` completions get their candidates
 * for EVERY object family, plus the storeless pack-index read the resource
 * browser (`info`, `doctor`, MCP prompts, the resource provider) shares.
 *
 * {@link indexCompletionEnv} is the one source-dispatched reader wired at the
 * `__complete` fast path (bin) and the `__complete` verb. It resolves five
 * storeless sources — all disk-readable, never a store/SPARQL:
 * - `index`    → the active pack's `index.json` entity names of a prefixed type.
 * - `skills`   → SKILL.md names via {@link discoverSkills} (filesystem walk).
 * - `prompts`  → the pack index's `ds:Prompt` entities (`label || name`).
 * - `tiers`    → the pack index's `ds:Tier` entities (their `ds:name`, else
 *                `label ?? name` when the index carries no `ds:name`).
 * - `prefixes` → the pack index's prefixes ∪ the default display prefixes.
 *
 * The index is loaded once (lazy `readFileSync` + plain `JSON.parse` — never a
 * store, facade, config evaluator, or zod schema; any I/O or parse error
 * degrades to `[]`) and shared across the index/prompts/tiers/prefixes sources;
 * the skills walk is memoized to one walk per `__complete` process.
 * {@link createIndexEntityReader} exposes the index read for the storeless
 * behavioural/safety tests; {@link emptyNameSource} is the default (no names).
 *
 * {@link readPackIndex} and {@link entityTotal} expose the same storeless read
 * to `info`/`doctor` and the resource surfaces. Everything here relies only on
 * the FROZEN `{ name, type }` index minimum (plus optional enrichment like
 * `label`/`altNames`), so the index can grow without breaking completion.
 *
 * Storeless-graph notes:
 * - The embedded fallback is read from `pack.index.generated` — its OWN
 *   generated module (only the index string) — so the storeless `__complete`
 *   path never pulls the n-quads/schema/manifest strings that live in
 *   `pack.generated`.
 * - The pack-cache path is INLINED here rather than imported from
 *   `kernel/runtime/paths` — that module reaches `kernel/config`, which the
 *   storeless-guarantee test (`safety.test.ts`) forbids on the completion
 *   import graph. The two lines of XDG resolution are duplicated on purpose to
 *   keep the fast path free of the config layer; `PackIndex`/`PackIndexEntity`
 *   are imported type-only, so no zod schema is loaded at runtime.
 * - `discoverSkills` (`node:fs/os/path` only) and `DEFAULT_PREFIX_MAP` (a pure
 *   const) are the only new edges — both leaf-clean, so the fast path stays free
 *   of boot/config/store/zod. The `ds:Prompt`/`ds:Tier` filters are INLINED
 *   (importing `prompts/source.ts` would cycle back into this module).
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { discoverSkills } from "../../capabilities/skill/discover.js";
// Inlined embedded index — its OWN generated module (only the index string), so
// the storeless `__complete` path never pulls the n-quads/schema/manifest
// strings that live in `pack.generated.ts`.
import { DEFAULT_PREFIX_MAP } from "../render/prefixes.js";
import { indexJson as EMBEDDED_INDEX_JSON } from "../runtime/graphpack/embedded/pack.index.generated.js";
import type { PackIndex, PackIndexEntity } from "../runtime/graphpack/types.js";
import type { CompletionSourceRef } from "../spec/types.js";
import type { CompletionEnv } from "./types.js";

/** The prefixed KG type every prompt entity carries (inlined; no cycle). */
const PROMPT_TYPE = "ds:Prompt";
/** The prefixed KG type every tier entity carries (inlined; no cycle). */
const TIER_TYPE = "ds:Tier";

/** The default name source: no index tier, so no candidates. */
export const emptyNameSource: CompletionEnv["names"] = () => [];

/** The committed project lock basename (mirrors `kernel/runtime/paths`). */
const LOCK_BASENAME = "pragma.lock.json";
/** The pack index filename (kept local so this path never imports the zod schema). */
const INDEX_FILE = "index.json";

/**
 * `$XDG_CACHE_HOME/pragma/packs/<hash>` — a pack's cache directory.
 *
 * Inlined from `kernel/config/paths` + `kernel/runtime/paths` so the completion
 * fast path stays off the config layer (see the module docblock).
 */
function packDir(contentHash: string): string {
  const base = process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(base, "pragma", "packs", contentHash);
}

/** The committed project lock file for a working directory. */
function lockPath(cwd: string): string {
  return join(cwd, LOCK_BASENAME);
}

/**
 * Read the active pack's storeless index (the locked pack, else the embedded
 * fallback), for the resource browser's list/autocomplete. Never boots the
 * store, never validates with zod — a plain `JSON.parse` off disk. Returns
 * `undefined` when no index is reachable, so callers degrade to a recovery hint.
 *
 * @param cwd - The project directory (to resolve the active pack).
 * @returns The active pack index, or `undefined` when none is reachable.
 */
export function readPackIndex(cwd: string): PackIndex | undefined {
  return loadActiveIndex(cwd);
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

/** Load the active pack's index: the locked pack, else the embedded fallback. */
function loadActiveIndex(cwd: string): PackIndex | undefined {
  try {
    const path = lockPath(cwd);
    if (existsSync(path)) {
      const lock = JSON.parse(readFileSync(path, "utf-8")) as {
        contentHash?: unknown;
      };
      if (typeof lock.contentHash === "string") {
        const indexPath = join(packDir(lock.contentHash), INDEX_FILE);
        if (existsSync(indexPath)) {
          return JSON.parse(readFileSync(indexPath, "utf-8")) as PackIndex;
        }
      }
    }
  } catch {
    // Fall through to the embedded fallback on any read/parse failure.
  }
  try {
    return JSON.parse(EMBEDDED_INDEX_JSON) as PackIndex;
  } catch {
    return undefined;
  }
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

/** All names of a prefixed type in the index (empty type = any), sorted. */
function indexNames(index: PackIndex | undefined, type: string): string[] {
  if (!index) return [];
  const names = new Set<string>();
  for (const entity of index.entities) {
    if (matchesType(entity, type)) names.add(entity.name);
  }
  return [...names].sort();
}

/** The `ds:Prompt` entities' completable names (`label || name`), sorted. */
function promptNames(index: PackIndex | undefined): string[] {
  if (!index) return [];
  const names = new Set<string>();
  for (const entity of index.entities) {
    if (matchesType(entity, PROMPT_TYPE))
      names.add(entity.label || entity.name);
  }
  return [...names].sort();
}

/**
 * The `ds:Tier` entities' completable names, sorted. `tier lookup` matches
 * `ds:name`, so when the index carries it (projected by `buildIndex` into
 * `altNames`) those are emitted exactly; a pack whose tiers were indexed without
 * `ds:name` falls back to `label ?? name` (empty rather than wrong).
 */
function tierNames(index: PackIndex | undefined): string[] {
  if (!index) return [];
  const names = new Set<string>();
  for (const entity of index.entities) {
    if (!matchesType(entity, TIER_TYPE)) continue;
    if (entity.altNames && entity.altNames.length > 0) {
      for (const alt of entity.altNames) names.add(alt);
    } else {
      names.add(entity.label || entity.name);
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
 * The pack index is loaded once, lazily, and reused across the index/prompts/
 * tiers/prefixes sources; the skills filesystem walk is memoized to one walk per
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
          return indexNames(getIndex(), ref.type ?? "");
        case "skills":
          return getSkills();
        case "prompts":
          return promptNames(getIndex());
        case "tiers":
          return tierNames(getIndex());
        case "prefixes":
          return prefixNames(getIndex());
      }
    },
  };
}
