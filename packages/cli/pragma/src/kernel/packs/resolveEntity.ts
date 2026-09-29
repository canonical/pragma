/**
 * Look up one or more pack entities by name, prefixed name, absolute IRI, or
 * glob, via the fetch strategy the pack declares.
 *
 * The resolve is ALWAYS generated SPARQL (an escaped literal or a validated
 * `<iri>` BIND) regardless of `source`; from the resolved IRI, values are
 * fetched either through more generated SELECTs (`sparql`) or one generated
 * GraphQL document (`graphql`). One poisoned query never discards the batch —
 * per-query failures are collected as structured error entries.
 *
 * WHICH query is chosen is decided by the ARGUMENT'S SHAPE first and the pack's
 * `source` second, and both dispatches live here. Getting that order wrong is
 * not a style question: it is what made an IRI reach a name FILTER on every
 * graphql-sourced pack, and what left an IRI-shaped glob expanding against a
 * population of names. The shape a user typed is a fact about the argument; the
 * fetch strategy is a fact about the pack, and it cannot change what the
 * argument means.
 *
 * Reached only behind a dynamic import from the lookup run body, so its imports
 * (including the GraphQL path) stay off the storeless fast path.
 */

import { callRecovery, PragmaError, type Recovery } from "../error/index.js";
import { MAX_SUGGESTIONS, suggestNames } from "../project/cli/suggestNames.js";
import { compactUri } from "../render/index.js";
import type { PragmaRuntime } from "../runtime/index.js";
import { activeExpands } from "./disclosure.js";
import { expandGlob, isGlobPattern } from "./glob.js";
import { fetchGraphqlLookup } from "./graphql/fetchGraphqlLookup.js";
import { isEmbeddableIri, resolveUri } from "./iri.js";
import {
  buildExpandQuery,
  buildIriResolveQuery,
  buildLookupByIriQuery,
  buildLookupIrisQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
  buildNameResolveQuery,
  SCOPE_TIER_VARIABLE,
} from "./sparql/buildLookupQuery.js";
import { runSelect } from "./sparql/runSelect.js";
import { localName } from "./tierScope.js";
import {
  expandIsSparql,
  type PackEntity,
  type PackLookup,
  type PackRow,
  type StorySource,
} from "./types.js";

/** A structured per-query lookup failure (never rejects the whole batch). */
export interface LookupError {
  readonly query: string;
  readonly code: string;
  readonly message: string;
  readonly suggestions?: readonly string[];
}

/**
 * The tier scope a name resolve answers under, as the resolver needs it.
 *
 * Built by the run body from the noun's declaration and the caller's arguments
 * ({@link ../tierScope}); the resolver only has to know which tiers count and
 * how to say so.
 */
export interface LookupScope {
  /** The entity → tier edge, a validated pack term. */
  readonly via: string;
  /** The in-scope tier IRIs. */
  readonly tiers: readonly string[];
  /** The scope in the words a reader can type back (`global, apps`). */
  readonly label: string;
}

/** A name whose only matches were outside the tier scope. */
export interface OutOfScopeAnswer {
  /** The name (or IRI, or glob expansion) that was looked up. */
  readonly query: string;
  /** The tiers the answers actually came from, as local names. */
  readonly tiers: readonly string[];
  /** The scope that held none of them, in the words `--tier` accepts. */
  readonly scope: string;
}

/**
 * The result of a (possibly multi-name) lookup.
 *
 * `results` may be LONGER than the arguments that produced it: a name several
 * entities share answers with all of them, ranked. There is no companion field
 * naming the ones not answered with, because there are none — an earlier draft
 * kept the single-entity arity and carried the rest as IRIs in a notice, which
 * is a sentence about an address where the payload is the address.
 *
 * The tier scope narrows that: for a SCOPED noun the in-scope matches are the
 * answer, and the out-of-scope ones are not returned — `block lookup button`
 * answers with the global Button alone. A name whose matches are ALL out of
 * scope is answered anyway, from the tiers it does live in, and says so through
 * {@link outOfScope}: refusing it would be answering "no such block" about a
 * block that exists, which is the one thing a lookup must never do.
 */
export interface LookupOutput {
  readonly results: PackEntity[];
  readonly errors: LookupError[];
  /**
   * The names answered from OUTSIDE the tier scope, because the scope held
   * nothing they reached. Absent when every answer was in scope — the ordinary
   * case, and the case the payload speaks for itself in.
   */
  readonly outOfScope?: OutOfScopeAnswer[];
  /** Set when the patterns matched more entities than {@link GLOB_EXPANSION_CAP}. */
  readonly truncated?: true;
  /**
   * The matched entities the cut was made in: the in-scope ones when they alone
   * exceed the cap, else every match. Present only when truncated.
   */
  readonly total?: number;
  /** Out-of-scope matches not counted in `total`, when there are any. */
  readonly elsewhere?: number;
  /** The level the cut answer was built at, present only when truncated. */
  readonly detail?: string;
}

/**
 * The most entities the patterns of ONE lookup may expand to (derivation in
 * BUDGETS.md). Literal arguments are never counted or cut.
 */
export const GLOB_EXPANSION_CAP = 50;

/** What the resolver needs from the runtime: the store + the query facade. */
type LookupRuntime = Pick<PragmaRuntime, "store" | "query">;

/**
 * Point a missed name at the noun's list — when it has one. A story may declare
 * a lookup alone, and a recovery naming a `list` that does not exist is a dead
 * end dressed as a way out.
 */
export function listRecovery(noun: string, hasList: boolean): Recovery {
  return hasList
    ? callRecovery({ verb: `${noun} list` }, `List available ${noun} entries.`)
    : { message: `Check the name: ${noun} entries cannot be listed.` };
}

/**
 * Resolve a batch of lookup queries, collecting per-query failures.
 *
 * @throws PragmaError INVALID_INPUT when the batch is empty.
 */
export async function resolveLookup(
  rt: LookupRuntime,
  lookup: PackLookup,
  noun: string,
  queries: readonly string[],
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
  hasList: boolean,
  scope?: LookupScope,
): Promise<LookupOutput> {
  if (queries.length === 0) {
    throw PragmaError.invalidInput("names", "(empty)", {
      recovery: listRecovery(noun, hasList),
    });
  }

  // Read at most once per call, however many patterns and misses need it.
  let pool: Promise<Addressable[]> | undefined;
  const addressable = (): Promise<Addressable[]> => {
    pool ??= listAddressable(rt, lookup, source, prefixes, scope?.via);
    return pool;
  };
  const expanded = await expandQueries(noun, queries, addressable, scope);
  const results: PackEntity[] = [];
  const errors: LookupError[] = [...expanded.globErrors];
  const outOfScope: OutOfScopeAnswer[] = [...expanded.outOfScope];
  // Two arguments may reach one entity by different routes — a name pattern
  // and an IRI pattern, a name and that entity's own IRI. It is answered once.
  const answered = new Set<string>();
  const settled = await Promise.allSettled(
    expanded.names.map((query) =>
      lookupOne(
        rt,
        lookup,
        noun,
        query,
        source,
        prefixes,
        level,
        addressable,
        scope,
      ),
    ),
  );
  for (const [index, outcome] of settled.entries()) {
    const query = expanded.names[index];
    if (query === undefined) continue;
    if (outcome.status === "fulfilled") {
      for (const entity of outcome.value.entities) {
        const uri = String(entity.uri);
        if (answered.has(uri)) continue;
        answered.add(uri);
        results.push(entity);
      }
      const fallback = outcome.value.outOfScope;
      const key = (answer: OutOfScopeAnswer): string =>
        `${answer.query.toLowerCase()}|${answer.tiers.join()}`;
      if (fallback && !outOfScope.some((a) => key(a) === key(fallback))) {
        outOfScope.push(fallback);
      }
      continue;
    }
    const error = outcome.reason;
    if (error instanceof PragmaError) {
      errors.push({
        query,
        code: error.code,
        message: error.message,
        ...(error.suggestions.length > 0
          ? { suggestions: error.suggestions }
          : {}),
      });
    } else {
      errors.push({
        query,
        code: "INTERNAL_ERROR",
        message: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return {
    results,
    errors,
    ...(outOfScope.length > 0 ? { outOfScope } : {}),
    ...(expanded.total === undefined
      ? {}
      : {
          truncated: true as const,
          total: expanded.total,
          ...(expanded.elsewhere ? { elsewhere: expanded.elsewhere } : {}),
          ...(level ? { detail: level } : {}),
        }),
  };
}

/**
 * The IRIs of every entity the given lookup arguments reach — the resolve
 * alone, with nothing fetched. Each is read as {@link resolveLookup} reads a
 * literal argument (a name, a prefixed IRI, an absolute IRI; never a pattern),
 * under no tier scope: a name reaches its entity in every tier.
 *
 * @returns The distinct IRIs; none when the store holds no entity of the noun.
 * @throws PragmaError INVALID_INPUT naming every argument that reaches nothing,
 *   with the suggestions a lookup miss offers; when an argument is empty; or
 *   when an IRI-shaped argument cannot be embedded in a query.
 */
export async function resolveEntityIris(
  rt: LookupRuntime,
  lookup: PackLookup,
  noun: string,
  queries: readonly string[],
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
): Promise<string[]> {
  const blank = queries.find((query) => query.trim() === "");
  if (blank !== undefined) {
    throw PragmaError.invalidInput(noun, "(empty)", {
      recovery: { message: `Give a ${noun} name or IRI.` },
    });
  }
  const iris = new Set<string>();
  const missed: string[] = [];
  // The graphql-sourced resolve is the bare `?uri ?name` pair: no field read.
  const bare: PackLookup = { ...lookup, source: "graphql" };
  for (const query of queries) {
    const rows = await runSelect(
      rt,
      buildResolveQuery(bare, query, prefixes, undefined),
      source,
    );
    if (rows.length === 0) missed.push(query);
    for (const row of firstRowPerEntity(rows)) iris.add(String(row.uri));
  }
  if (missed.length === 0) return [...iris];
  const pool = listAddressable(rt, lookup, source, prefixes, undefined);
  if ((await pool).length === 0) return [];
  const suggestions = await Promise.all(
    missed.map((query) => suggestForMiss(() => pool, query)),
  );
  throw new PragmaError({
    code: "INVALID_INPUT",
    message: `No ${noun} is named "${missed.join('", "')}".`,
    // Interleaved, so every miss gets a share of the slots.
    suggestions: [
      ...new Set(
        suggestions
          .flatMap((list, miss) =>
            list.map((name, rank) => ({ name, rank, miss })),
          )
          .sort((a, b) => a.rank - b.rank || a.miss - b.miss)
          .map((entry) => entry.name),
      ),
    ].slice(0, MAX_SUGGESTIONS),
  });
}

/**
 * Expand glob queries to the ENTITIES they reach; literals pass through.
 *
 * An IRI-shaped glob is matched against both spellings of an IRI, a prefix-less
 * one against names and IRI local names. Matches are keyed by entity, so two
 * routes to one entity count once. Under a tier scope the in-scope matches come
 * first and an out-of-scope namesake of one is dropped, as a name lookup would;
 * the cap is applied after that, over a deterministic order.
 */
async function expandQueries(
  noun: string,
  queries: readonly string[],
  addressable: () => Promise<Addressable[]>,
  scope: LookupScope | undefined,
): Promise<{
  names: string[];
  globErrors: LookupError[];
  outOfScope: OutOfScopeAnswer[];
  total?: number;
  elsewhere?: number;
}> {
  const literals = [...new Set(queries.filter((q) => !isGlobPattern(q)))];
  const globs = queries.filter(isGlobPattern);
  if (globs.length === 0) {
    return { names: literals, globErrors: [], outOfScope: [] };
  }
  const pool = await addressable();
  const globErrors: LookupError[] = [];
  const matched = new Map<string, Addressable>();
  const inScope = (entity: Addressable): boolean =>
    !scope || entity.tier === undefined || scope.tiers.includes(entity.tier);
  for (const glob of globs) {
    const forms = (entity: Addressable): string[] =>
      looksLikeIri(glob)
        ? [entity.uri, entity.compact]
        : [entity.name ?? "", entity.local];
    const hits = new Set(expandGlob(glob, pool.flatMap(forms)));
    const entities = pool.filter((entity) =>
      forms(entity).some((form) => hits.has(form)),
    );
    if (entities.length === 0) {
      globErrors.push({
        query: glob,
        code: "EMPTY_RESULTS",
        message: `No ${noun} entries matching "${glob}".`,
      });
    }
    for (const entity of entities) {
      // An entity in two tiers is in scope when either row is.
      const known = matched.get(entity.uri);
      if (!known || (!inScope(known) && inScope(entity))) {
        matched.set(entity.uri, entity);
      }
    }
  }
  const label = (entity: Addressable): string => entity.name ?? entity.compact;
  const scoped = new Set(
    [...matched.values()].filter(inScope).map((e) => label(e).toLowerCase()),
  );
  const ordered = [...matched.values()]
    .filter((e) => inScope(e) || !scoped.has(label(e).toLowerCase()))
    .sort(
      (a, b) =>
        Number(!inScope(a)) - Number(!inScope(b)) ||
        label(a).localeCompare(label(b)) ||
        a.uri.localeCompare(b.uri),
    );
  const kept = ordered.slice(0, GLOB_EXPANSION_CAP);
  const within = ordered.filter(inScope).length;
  return {
    names: [...literals, ...kept.map((entity) => entity.compact)],
    globErrors,
    outOfScope: kept
      .filter((entity) => !inScope(entity))
      .map((entity) => ({
        query: label(entity),
        tiers: [scopeTierName(entity.tier ?? "")],
        scope: scope?.label ?? "",
      })),
    ...(ordered.length <= kept.length
      ? {}
      : within > kept.length
        ? { total: within, elsewhere: ordered.length - within }
        : { total: ordered.length }),
  };
}

/**
 * What to offer for an argument that reached nothing: near names, and the
 * prefixed IRI of an entity whose local name is what was typed (exact match
 * first). A bare local name is not an address; the miss names the form that is.
 */
async function suggestForMiss(
  addressable: () => Promise<Addressable[]>,
  query: string,
): Promise<string[]> {
  const pool = await addressable();
  const names = [...new Set(pool.flatMap((e) => (e.name ? [e.name] : [])))];
  const taken = new Set(names.map((name) => name.trim().toLowerCase()));
  const byLocal = new Map<string, string[]>();
  for (const entity of pool) {
    const key = entity.local.toLowerCase();
    if (taken.has(key)) continue;
    byLocal.set(key, [
      ...new Set([...(byLocal.get(key) ?? []), entity.compact]),
    ]);
  }
  const exact = byLocal.get(query.trim().toLowerCase()) ?? [];
  const ranked = suggestNames(query, [...names, ...byLocal.keys()]).flatMap(
    (candidate) => byLocal.get(candidate) ?? [candidate],
  );
  return [...new Set([...exact, ...ranked])].slice(0, MAX_SUGGESTIONS);
}

/**
 * Look up every entity a lookup argument reaches, dispatching to the pack's
 * declared fetch source.
 *
 * One argument, EVERY entity it reaches — ranked, best first.
 *
 * `lookup` is deliberately one tool for the singular and the plural case. An
 * agent that had to decide up front whether a name is unique would pay two
 * round trips to find out, and the answer is not knowable from the name: 25
 * live block names reach two or three blocks apiece, and the caller cannot
 * tell which until it asks. Returning them all costs the caller nothing when a
 * name is unique — the array is one long — and saves a whole exchange when it
 * is not.
 *
 * That is why the `LIMIT 1` had to go rather than be compensated for. With it,
 * `block lookup button` answered with Launchpad's Button and gave no sign the
 * global one existed, because `apps_launchpad…` sorts before `global…`. An
 * earlier draft of this change kept the arity and named the losers in a notice;
 * a notice is a sentence about an address, and the payload is the address.
 *
 * Ranking still matters, and matters more: it is now what ORDERS the answer
 * rather than what silently picks it. The best row leads, so a caller reading
 * only the first gets the entity the ranking believes was meant.
 *
 * The rows are collapsed to one per `?uri` first. The sparql form projects its
 * fields in the same SELECT, so a multi-valued field yields one row per value;
 * that has always been true and `LIMIT 1` merely hid it. Without the collapse
 * one entity would report itself as several.
 */
async function lookupOne(
  rt: LookupRuntime,
  lookup: PackLookup,
  noun: string,
  query: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
  addressable: () => Promise<Addressable[]>,
  scope?: LookupScope,
): Promise<{ entities: PackEntity[]; outOfScope?: OutOfScopeAnswer }> {
  const graphqlSourced = lookup.source === "graphql";
  const rows = await runSelect(
    rt,
    buildResolveQuery(lookup, query, prefixes, level, scope),
    source,
  );
  const resolved = firstRowPerEntity(rows);
  if (resolved.length === 0) {
    throw PragmaError.notFound(noun, query, {
      suggestions: await suggestForMiss(addressable, query),
    });
  }

  const chosen = applyScope(resolved, query, scope);
  const bases = chosen.rows.map(withoutScopeVariable);
  const fallback = chosen.outOfScope ? { outOfScope: chosen.outOfScope } : {};

  if (graphqlSourced) {
    const fetched = await Promise.all(
      bases.map((base) =>
        fetchGraphqlLookup(
          rt,
          lookup,
          String(base.uri),
          base.name ?? query,
          // The GraphQL lane's only use of the source is CONFIG_ERROR
          // attribution, which is right for any origin — so it takes the label,
          // not provenance.
          source.label,
          prefixes,
          level,
        ),
      ),
    );
    // A graphql lookup may still declare SPARQL-lane expands (see
    // `PackExpand.source`), and they are fetched HERE rather than inside the
    // GraphQL lane: one entity, two lanes, merged on the way out. The document
    // generator skips exactly what this loop claims, so no expand is fetched
    // twice and none is dropped.
    const entities = await Promise.all(
      fetched.map(async (entity) =>
        addSparqlExpands(rt, lookup, entity, source, level),
      ),
    );
    return { entities, ...fallback };
  }

  const entities: PackEntity[] = [];
  for (const base of bases) {
    entities.push(
      await addSparqlExpands(rt, lookup, { ...base }, source, level),
    );
  }
  return { entities, ...fallback };
}

/**
 * Narrow a resolve to the tier scope — or, when the scope holds none of what
 * the name reached, answer from outside it and say so.
 *
 * THE FALLBACK IS THE POINT, and it is why the scope is not a `FILTER` in the
 * resolve query. A scoped filter would turn `block lookup back-link` — an LXD
 * component, out of the default scope — into ENTITY_NOT_FOUND with suggestions,
 * i.e. into "no such block" about a block the store holds and `block list
 * --tier apps_lxd` prints. A name a reader typed is evidence they mean
 * something; the scope decides WHICH of several it means, never whether it
 * exists.
 *
 * An entity with no tier at all is treated as IN scope. It cannot be placed, so
 * it cannot be placed outside — and being unplaceable is not grounds for being
 * unfindable.
 */
function applyScope(
  rows: readonly PackRow[],
  query: string,
  scope: LookupScope | undefined,
): { rows: readonly PackRow[]; outOfScope?: OutOfScopeAnswer } {
  if (!scope) return { rows };
  const inScope = new Set(scope.tiers);
  const kept = rows.filter((row) => {
    const tier = row[SCOPE_TIER_VARIABLE];
    return tier === undefined || tier === "" || inScope.has(tier);
  });
  if (kept.length > 0) return { rows: kept };
  const tiers = [
    ...new Set(
      rows
        .map((row) => row[SCOPE_TIER_VARIABLE] ?? "")
        .filter((tier) => tier !== "")
        .map(scopeTierName),
    ),
  ];
  return { rows, outOfScope: { query, tiers, scope: scope.label } };
}

/** A tier IRI as the scope reports it: the local name `--tier` accepts. */
function scopeTierName(iri: string): string {
  return iri.replace(/^.*[#/]/, "");
}

/**
 * Drop the kernel's scope variable from a resolved row.
 *
 * The sparql-sourced lane spreads its resolve row straight into the entity it
 * answers with, so a variable the kernel added for its own decision would land
 * in `--format json` as a field the story never declared.
 */
function withoutScopeVariable(row: PackRow): PackRow {
  if (!(SCOPE_TIER_VARIABLE in row)) return row;
  const { [SCOPE_TIER_VARIABLE]: _tier, ...rest } = row;
  return rest;
}

/**
 * Fetch every SPARQL-lane expand active at this level onto one entity.
 *
 * The lane test is the expand's, not the lookup's, so this serves both callers:
 * on a sparql lookup every expand is one of these, and on a graphql lookup only
 * those that opted out of the document.
 *
 * @param rt - The runtime (store + query facade).
 * @param lookup - The validated lookup declaration.
 * @param entity - The entity to add child arrays to (mutated and returned).
 * @param source - Pack source, for error attribution.
 * @param level - Active canonical disclosure level.
 * @returns The same entity, with one array per fetched expand.
 * @note Impure — queries the store, once per expand.
 */
async function addSparqlExpands(
  rt: LookupRuntime,
  lookup: PackLookup,
  entity: PackEntity,
  source: StorySource,
  level: string | undefined,
): Promise<PackEntity> {
  for (const expand of activeExpands(lookup, level)) {
    if (!expandIsSparql(lookup, expand)) continue;
    const many = expand.select.flatMap((field) =>
      "many" in field && field.many ? [field.name] : [],
    );
    const rows = (await runSelect(
      rt,
      buildExpandQuery(expand, String(entity.uri), lookup),
      source,
      // A section whose vocabulary this store does not bind renders EMPTY
      // rather than taking the whole entity down with it — see
      // `RunSelectOptions.degradeOnUnboundPrefix`. The block lookup's tokens
      // read the anatomy DSL's style key and state, which a store built
      // without that pack does not bind, and every other section of that
      // block is still perfectly answerable.
      { degradeOnUnboundPrefix: true },
    )) as PackRow[];
    // An aggregate has no order of its own; a `many` cell is sorted here.
    entity[expand.name] = rows.map((row) => ({
      ...row,
      ...Object.fromEntries(
        many
          .filter((name) => row[name] !== undefined)
          .map((name) => [name, (row[name] ?? "").split(" ").sort().join(" ")]),
      ),
    }));
  }
  return entity;
}

/** Collapse a ranked resolve to one row per entity, keeping the best-ranked. */
function firstRowPerEntity(rows: readonly PackRow[]): PackRow[] {
  const seen = new Set<string>();
  const bases: PackRow[] = [];
  for (const row of rows) {
    if (!row.uri || seen.has(row.uri)) continue;
    seen.add(row.uri);
    bases.push(row);
  }
  return bases;
}

/**
 * Build the resolve SELECT for one lookup argument: shape first, source second.
 *
 * The four cells of that 2×2 are the whole dispatch. A graphql-sourced pack
 * resolves to an IRI and fetches everything else through its document, so both
 * of its queries are the minimal `?uri ?name` pair; a sparql-sourced pack reads
 * its fields in the same SELECT, so both of its queries carry the level-gated
 * projection.
 */
function buildResolveQuery(
  lookup: PackLookup,
  query: string,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
  scope?: LookupScope,
): string {
  const graphqlSourced = lookup.source === "graphql";
  if (!looksLikeIri(query)) {
    return graphqlSourced
      ? buildNameResolveQuery(lookup, query, scope?.via)
      : buildLookupQuery(lookup, query, level, scope?.via);
  }
  // An IRI-ADDRESSED form is never scoped, and that is not an omission. An IRI
  // reaches exactly one entity, so there is nothing for a scope to choose
  // between — the whole job the scope does. A caller who pastes
  // `ds:apps_lxd.component.back_link` has already said which tier they mean.
  const resolved = resolveUri(query, prefixes);
  if (!isEmbeddableIri(resolved)) {
    throw PragmaError.invalidInput("name", query, {
      recovery: {
        message:
          "Use an absolute IRI (https://…), a prefixed name (prefix:local), or a plain entity name.",
      },
    });
  }
  return graphqlSourced
    ? buildIriResolveQuery(lookup, resolved)
    : buildLookupByIriQuery(lookup, resolved, level);
}

/** Whether a lookup query addresses an entity by IRI or prefixed name. */
function looksLikeIri(query: string): boolean {
  return (
    query.startsWith("http://") ||
    query.startsWith("https://") ||
    // Neither an IRI nor a SPARQL prefixed name may contain whitespace, so a
    // colon in a spaced string is part of a plain entity name — e.g. the
    // concept "Foundations: Grid" — not a prefix separator.
    (query.includes(":") && !/\s/.test(query))
  );
}

/** One way to address an entity: a row per name and per tier it carries. */
interface Addressable {
  /** The canonical (absolute) IRI. */
  readonly uri: string;
  /** The prefixed form, or the IRI itself when no registered prefix matches. */
  readonly compact: string;
  /** The IRI's local name. */
  readonly local: string;
  /** The `by` value the entity carries, when it carries one. */
  readonly name?: string;
  /** The tier IRI, when the lookup is scoped and the entity is in one. */
  readonly tier?: string;
}

/** List every entity the lookup can address by IRI. */
async function listAddressable(
  rt: LookupRuntime,
  lookup: PackLookup,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  via: string | undefined,
): Promise<Addressable[]> {
  const rows = await runSelect(rt, buildLookupIrisQuery(lookup, via), source);
  return rows
    .filter((row) => (row.uri ?? "") !== "")
    .map((row) => {
      const uri = row.uri as string;
      const tier = row[SCOPE_TIER_VARIABLE];
      return {
        uri,
        compact: compactUri(uri, prefixes),
        local: localName(uri),
        ...(row.name ? { name: row.name } : {}),
        ...(tier ? { tier } : {}),
      };
    });
}

/** List every entity name the lookup can address (miss suggestions + sample/glob). */
export async function listEntityNames(
  rt: LookupRuntime,
  lookup: PackLookup,
  source: StorySource,
): Promise<string[]> {
  const rows = await runSelect(rt, buildLookupNamesQuery(lookup), source);
  return rows.map((row) => row.name ?? "").filter((name) => name !== "");
}
