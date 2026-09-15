/**
 * The tier scope: which tiers a read of a tiered noun answers from.
 *
 * WHAT IT IS FOR. The design system's tier hierarchy has two levels — five
 * top-level tiers (`global`, `apps`, `sites`, `documentation`, `stores`) and
 * ten second-level ones beneath `apps` and `sites` — and every read used to
 * answer from all fifteen at once. `block list` printed 252 blocks, a third of
 * them belonging to one product's own screens; `block lookup button` printed
 * the global Button AND Launchpad's, concatenated, with nothing saying why
 * there were two. The `tier` config key that was supposed to narrow this was
 * read by nothing. So a read of a tiered noun now has a SCOPE, and the scope is
 * part of the query rather than a predicate over what the query returned.
 *
 * THE RULE, in one place:
 *
 * - DEFAULT — the top-level tiers. A tier is top-level when its path-shaped
 *   name has no `/` (see {@link PackTierScope.by}): nothing sits above it.
 * - A CHOSEN tier (`--tier apps_lxd`, or `tier: "apps_lxd"` in config) — that
 *   tier, its ancestors, and the declared base tier. `apps_lxd` therefore
 *   answers from `global`, `apps` and `apps_lxd`: the blocks an LXD screen is
 *   actually built from, which is the chain the design system's own colophon
 *   describes ("a lower tier inherits and overrides the blocks of its
 *   ancestors").
 * - `all` — no scope at all, the pre-scope behaviour, reachable per call
 *   (`--tier all`) or as a setting (`tier: "all"`).
 *
 * PRECEDENCE is the one every other per-call argument has: the flag beats the
 * config, the config beats the default. A per-call `--tier` is not a second
 * narrowing on top of a configured one — it REPLACES it, because a chain is not
 * an intersection of chains and an agent that passes `--tier apps_lxd` on a
 * machine configured to `apps_launchpad` means the first.
 *
 * THE HIERARCHY IS READ FROM THE STORE, ONCE. Nothing here enumerates a tier:
 * the tiers, their names and therefore their parents are read from the pack the
 * session booted, so a tier added upstream tomorrow is scoped correctly with no
 * edit here. The read is memoized per store SESSION (not per process): a
 * `sources update` on the long-lived MCP server invalidates the session, and the
 * next read re-learns the hierarchy from the pack that replaced it.
 */

import { cliRecovery, PragmaError } from "../error/index.js";
import type { PragmaRuntime } from "../runtime/index.js";
import type { StoreSession } from "../runtime/types.js";
import { formatTerm } from "./sparql/escape.js";
import { runSelect } from "./sparql/runSelect.js";
import { EVERY_TIER, type PackTierScope, type StorySource } from "./types.js";

/** One tier, with the hierarchy its own name states. */
export interface TierNode {
  /** The tier's IRI, as the query filter binds it. */
  readonly iri: string;
  /** The tier's path-shaped name (`"Apps/LXD"`). */
  readonly name: string;
  /**
   * The IRI's local name (`"apps_lxd"`) — the spelling `block list`'s `Tier`
   * column prints and `--tier` accepts, so the scope is reported in the words a
   * reader can type straight back.
   */
  readonly local: string;
  /** How deep the name sits: `"Global"` is 1, `"Apps/LXD"` is 2. */
  readonly depth: number;
}

/** The tier hierarchy one pack declares, as the scope reads it. */
export interface TierHierarchy {
  /** Every tier the store knows, in the order the read returned them. */
  readonly tiers: readonly TierNode[];
  /** The declared base tier, when the pack declares one and the store has it. */
  readonly base?: TierNode;
  /** Every spelling a caller may address a tier by → that tier. */
  readonly bySpelling: ReadonlyMap<string, TierNode>;
}

/** The tiers a read answers from, or every tier. */
export type TierScope =
  | { readonly kind: "all" }
  | {
      /** The scope is these tiers, in reporting order (base first, then shallowest). */
      readonly kind: "tiers";
      readonly tiers: readonly TierNode[];
      /** The tier a caller (or their config) asked for, when one was asked for. */
      readonly chosen?: TierNode;
    };

/**
 * Every tier read once per store session, per declaration.
 *
 * Keyed on the SESSION so the memo cannot outlive the pack it describes, and
 * nested by declaration so the three nouns that declare the same hierarchy
 * (`block`, `modifier`, `concept`) share ONE query rather than issuing three
 * identical ones per invocation. A `WeakMap` because the session is the owner:
 * when the runtime drops it, this drops with it.
 */
const SESSIONS = new WeakMap<
  StoreSession,
  Map<string, Promise<TierHierarchy>>
>();

/** The SELECT reading every tier and its path-shaped name. */
function hierarchyQuery(declaration: PackTierScope): string {
  return [
    "SELECT ?tier ?name WHERE {",
    `  ?tier a ${formatTerm(declaration.type)} .`,
    `  ?tier ${formatTerm(declaration.by)} ?name .`,
    "}",
    "ORDER BY ?name",
  ].join("\n");
}

/**
 * Read (once per session) the tier hierarchy a declaration describes.
 *
 * @param rt - The runtime, for the store and the query facade.
 * @param declaration - The noun's declared tier hierarchy.
 * @param source - The story's provenance, for a query diagnosis.
 * @returns The hierarchy, memoized for this store session.
 */
export async function readTierHierarchy(
  rt: PragmaRuntime,
  declaration: PackTierScope,
  source: StorySource,
): Promise<TierHierarchy> {
  const session = await rt.store.get();
  const key = [
    declaration.type,
    declaration.via,
    declaration.by,
    declaration.base ?? "",
  ].join("|");
  let perDeclaration = SESSIONS.get(session);
  if (!perDeclaration) {
    perDeclaration = new Map();
    SESSIONS.set(session, perDeclaration);
  }
  const memoized = perDeclaration.get(key);
  if (memoized) return memoized;
  const reading = runSelect(rt, hierarchyQuery(declaration), source).then(
    (rows) =>
      buildTierHierarchy(
        rows.map((row) => ({ iri: row.tier ?? "", name: row.name ?? "" })),
        declaration,
      ),
  );
  perDeclaration.set(key, reading);
  return reading;
}

/**
 * The local name of a term: everything after its last `#`, `/` or `:`.
 *
 * The `:` is what makes one function serve both spellings a term arrives in. A
 * tier read out of the store is an absolute IRI
 * (`https://ds.canonical.com/global`), and the declared `base` beside it is a
 * PREFIXED name (`ds:global`) — the grammar admits either, everywhere. Reading
 * only `#` and `/` left `ds:global` as its own local name, so the base tier
 * matched nothing and the base-first reporting order silently became
 * alphabetical.
 */
export function localName(term: string): string {
  return term.replace(/^.*[#/:]/, "");
}

/**
 * Every spelling of a tier a caller may type.
 *
 * Three, because three are in circulation and all of them are the reader's own
 * words: the local name the `Tier` column prints (`apps_lxd`), the display name
 * `tier list` prints (`Apps/LXD`), and that display name with its separator
 * written the way the IRI writes it (`apps/lxd` — the spelling the config key's
 * own documentation used before anything read it). Refusing two of the three
 * would be refusing a value this distribution itself published.
 */
function spellings(tier: TierNode): string[] {
  return [
    tier.local.toLowerCase(),
    tier.name.toLowerCase(),
    tier.name.toLowerCase().replaceAll("/", "_"),
  ];
}

/**
 * Build the hierarchy from the rows the store returned.
 *
 * Exported for the unit tests, which state the hierarchy rules over a handful
 * of rows rather than over the shipped pack's fifteen tiers.
 *
 * @param rows - One `{ iri, name }` per tier.
 * @param declaration - The noun's declared tier hierarchy.
 * @returns The hierarchy, with tiers carrying an empty IRI or name dropped —
 *   a tier the scope cannot address or place is not a tier it can scope by.
 */
export function buildTierHierarchy(
  rows: readonly { readonly iri: string; readonly name: string }[],
  declaration: PackTierScope,
): TierHierarchy {
  const tiers: TierNode[] = [];
  for (const row of rows) {
    if (row.iri === "" || row.name === "") continue;
    tiers.push({
      iri: row.iri,
      name: row.name,
      local: localName(row.iri),
      depth: row.name.split("/").length,
    });
  }
  const bySpelling = new Map<string, TierNode>();
  for (const tier of tiers) {
    for (const spelling of spellings(tier)) {
      if (!bySpelling.has(spelling)) bySpelling.set(spelling, tier);
    }
  }
  const declaredBase = declaration.base;
  const base =
    declaredBase === undefined
      ? undefined
      : tiers.find(
          (tier) =>
            tier.iri === declaredBase ||
            tier.local.toLowerCase() === localName(declaredBase).toLowerCase(),
        );
  return { tiers, bySpelling, ...(base ? { base } : {}) };
}

/**
 * The reporting order: the base tier first, then shallowest first, then
 * alphabetical.
 *
 * The base leads because it is what the rest inherit from, and the chain then
 * reads root-to-leaf (`global, apps, apps_lxd`) — the direction the hierarchy
 * is written in everywhere else in this distribution.
 */
function orderTiers(
  tiers: readonly TierNode[],
  base: TierNode | undefined,
): TierNode[] {
  return [...tiers].sort((left, right) => {
    if (left.iri === right.iri) return 0;
    if (base) {
      if (left.iri === base.iri) return -1;
      if (right.iri === base.iri) return 1;
    }
    return (
      left.depth - right.depth ||
      left.local.localeCompare(right.local) ||
      left.iri.localeCompare(right.iri)
    );
  });
}

/** The tiers whose name states no parent — the default scope. */
function topLevel(hierarchy: TierHierarchy): TierNode[] {
  return hierarchy.tiers.filter((tier) => tier.depth === 1);
}

/**
 * The chosen tier's chain: itself, every tier its name sits under, and the base.
 *
 * An ancestor is found by NAME, not by an edge, because the graph asserts no
 * edge (see {@link PackTierScope}). A name segment naming no declared tier
 * contributes nothing — an orphan `Apps/LXD` in a pack with no `Apps` is
 * scoped to itself and the base, which is the honest reading of the only
 * hierarchy it states.
 */
function chain(hierarchy: TierHierarchy, chosen: TierNode): TierNode[] {
  const segments = chosen.name.split("/");
  const ancestorNames = new Set(
    segments.slice(0, -1).map((_, index) =>
      segments
        .slice(0, index + 1)
        .join("/")
        .toLowerCase(),
    ),
  );
  const selected = hierarchy.tiers.filter(
    (tier) =>
      tier.iri === chosen.iri ||
      ancestorNames.has(tier.name.toLowerCase()) ||
      (hierarchy.base !== undefined && tier.iri === hierarchy.base.iri),
  );
  return orderTiers(selected, hierarchy.base);
}

/** What a caller and their config asked of the scope for one read. */
export interface TierRequest {
  /** The per-call `--tier` argument (`tier` over MCP), when one was passed. */
  readonly requested?: unknown;
  /** The `tier` config key, when it is set. */
  readonly configured?: string;
}

/**
 * Resolve the scope one read answers under.
 *
 * @param hierarchy - The tiers the store knows.
 * @param request - The per-call argument and the configured default.
 * @returns Every tier (when asked for, or when the store knows no tiers), else
 *   the chosen tier's chain, else the top-level tiers.
 * @throws PragmaError INVALID_INPUT when a tier was asked for by a name no tier
 *   answers to, carrying the names that do.
 */
export function resolveTierScope(
  hierarchy: TierHierarchy,
  request: TierRequest,
): TierScope {
  // A graph with no tiers in it is not a narrowed graph: there is nothing to
  // scope by, so the read answers as it always did and says nothing about a
  // scope it never applied.
  if (hierarchy.tiers.length === 0) return { kind: "all" };
  const perCall = readRequested(request.requested);
  const asked = perCall ?? request.configured?.trim();
  if (asked === undefined || asked === "") {
    return {
      kind: "tiers",
      tiers: orderTiers(topLevel(hierarchy), hierarchy.base),
    };
  }
  if (asked.toLowerCase() === EVERY_TIER) return { kind: "all" };
  const chosen = hierarchy.bySpelling.get(asked.toLowerCase());
  if (!chosen) {
    const validOptions = [
      EVERY_TIER,
      ...hierarchy.tiers.map((tier) => tier.local).sort(),
    ];
    // The recovery names WHERE the bad value came from, because the two places
    // are fixed differently and only one of them is in the caller's hand: a
    // per-call `--tier` is retyped, a configured one is unset. A reader whose
    // machine is set to a tier this pack does not carry would otherwise be told
    // to retype an argument they never typed.
    throw PragmaError.invalidInput("tier", asked, {
      validOptions,
      recovery:
        perCall === undefined
          ? cliRecovery(
              "config unset tier",
              `The \`tier\` config key names "${asked}", which is not one of this pack's ${hierarchy.tiers.length} tiers. Clear it, or set one that exists.`,
              { tool: "config_unset", params: { key: "tier" } },
            )
          : cliRecovery(
              "tier list",
              `Name one of the ${hierarchy.tiers.length} tiers, or "${EVERY_TIER}" for every tier.`,
              { tool: "tier_list", params: {} },
            ),
    });
  }
  return { kind: "tiers", tiers: chain(hierarchy, chosen), chosen };
}

/**
 * The per-call argument as a tier name.
 *
 * @throws PragmaError INVALID_INPUT when it is not a string — a repeated
 *   `--tier` is a caller asking for two chains at once, which is not a chain.
 */
function readRequested(provided: unknown): string | undefined {
  if (provided === undefined) return undefined;
  if (typeof provided === "string") {
    const trimmed = provided.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  throw PragmaError.invalidInput("tier", String(provided), {
    recovery: {
      message: `Pass one tier name, or "${EVERY_TIER}" for every tier.`,
    },
  });
}

/**
 * The scope one read of a tiered noun answers under, resolved from everything
 * that has a say: the story's declaration, the caller's argument, the config.
 *
 * @param rt - The runtime (store for the hierarchy, config for the default).
 * @param declaration - The noun's declared hierarchy, absent when it is not
 *   tiered — in which case there is no scope and nothing is read.
 * @param requested - The per-call `--tier` argument, if any.
 * @param source - The story's provenance, for a query diagnosis.
 * @returns The scope, or `undefined` for an unscoped noun.
 * @throws PragmaError INVALID_INPUT when the tier asked for does not exist.
 */
export async function resolveReadScope(
  rt: PragmaRuntime,
  declaration: PackTierScope | undefined,
  requested: unknown,
  source: StorySource,
): Promise<TierScope | undefined> {
  if (!declaration) return undefined;
  const hierarchy = await readTierHierarchy(rt, declaration, source);
  const { config } = await rt.loadConfig();
  return resolveTierScope(hierarchy, {
    requested,
    ...(config.tier === undefined ? {} : { configured: config.tier }),
  });
}

/**
 * The scope in the words a reader can type back: `global, apps, apps_lxd`.
 *
 * @param scope - The resolved scope.
 * @returns The in-scope tier local names, or `undefined` for every tier — a
 *   read that narrowed nothing has no scope to report.
 */
export function scopeLabel(scope: TierScope): string | undefined {
  if (scope.kind === "all") return undefined;
  return scope.tiers.map((tier) => tier.local).join(", ");
}

/** The in-scope tier IRIs, for the query filter. */
export function scopeIris(scope: TierScope): readonly string[] {
  return scope.kind === "all" ? [] : scope.tiers.map((tier) => tier.iri);
}
