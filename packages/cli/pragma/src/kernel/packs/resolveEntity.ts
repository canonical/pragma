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

import { cliRecovery, PragmaError } from "../error/index.js";
import { suggestNames } from "../project/cli/suggestNames.js";
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
import {
  expandIsSparql,
  type PackChildRow,
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
}

/** What the resolver needs from the runtime: the store + the query facade. */
type LookupRuntime = Pick<PragmaRuntime, "store" | "query">;

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
  scope?: LookupScope,
): Promise<LookupOutput> {
  if (queries.length === 0) {
    throw PragmaError.invalidInput("names", "(empty)", {
      recovery: cliRecovery(`${noun} list`, `List available ${noun} entries.`, {
        tool: `${noun}_list`,
        // A concrete, valid argument bag rather than a bare tool name: an
        // agent can call the recovery as written instead of guessing one.
        params: {},
      }),
    });
  }

  const expanded = await expandQueries(
    rt,
    lookup,
    noun,
    source,
    queries,
    prefixes,
  );
  const results: PackEntity[] = [];
  const errors: LookupError[] = [...expanded.globErrors];
  const outOfScope: OutOfScopeAnswer[] = [];
  const settled = await Promise.allSettled(
    expanded.names.map((query) =>
      lookupOne(rt, lookup, noun, query, source, prefixes, level, scope),
    ),
  );
  for (const [index, outcome] of settled.entries()) {
    const query = expanded.names[index];
    if (query === undefined) continue;
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value.entities);
      if (outcome.value.outOfScope) outOfScope.push(outcome.value.outOfScope);
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
  };
}

/**
 * Expand glob queries against the population their own shape addresses;
 * literals pass through.
 *
 * A name glob expands over the `by` values, an IRI glob over the entity IRIs —
 * the same split {@link buildResolveQuery} makes, because a glob is just a
 * lookup argument with a `*` in it. Expanding an IRI pattern over names was why
 * `ds:global.component.but*` matched nothing on any pack while shell completion
 * offered nothing BUT those IRIs. Each population is fetched at most once, and
 * only when a glob of that shape is actually present.
 */
async function expandQueries(
  rt: LookupRuntime,
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  queries: readonly string[],
  prefixes: Readonly<Record<string, string>>,
): Promise<{ names: string[]; globErrors: LookupError[] }> {
  if (!queries.some(isGlobPattern))
    return { names: [...queries], globErrors: [] };
  const globs = queries.filter(isGlobPattern);
  const byIri = globs.some(looksLikeIri)
    ? await listEntityIriSpellings(rt, lookup, source, prefixes)
    : new Map<string, string>();
  const byName = globs.some((glob) => !looksLikeIri(glob))
    ? await listEntityNames(rt, lookup, source)
    : [];
  const names: string[] = [];
  const globErrors: LookupError[] = [];
  for (const query of queries) {
    if (!isGlobPattern(query)) {
      names.push(query);
      continue;
    }
    // An IRI glob expands over every spelling, then collapses to the entity:
    // matching `ds:button` and its absolute twin must not list it twice.
    const matches = looksLikeIri(query)
      ? [
          ...new Set(
            expandGlob(query, [...byIri.keys()]).map(
              (spelling) => byIri.get(spelling) ?? spelling,
            ),
          ),
        ]
      : expandGlob(query, byName);
    if (matches.length === 0) {
      globErrors.push({
        query,
        code: "EMPTY_RESULTS",
        message: `No ${noun} entries matching "${query}".`,
      });
    } else {
      names.push(...matches);
    }
  }
  return { names, globErrors };
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
    const candidates = await listEntityNames(rt, lookup, source);
    throw PragmaError.notFound(noun, query, {
      suggestions: suggestNames(query, candidates),
      recovery: cliRecovery(`${noun} list`, `List available ${noun} entries.`, {
        tool: `${noun}_list`,
        // A concrete, valid argument bag rather than a bare tool name: an
        // agent can call the recovery as written instead of guessing one.
        params: {},
      }),
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
    entity[expand.name] = (await runSelect(
      rt,
      buildExpandQuery(expand, String(entity.uri), lookup),
      source,
    )) as readonly PackChildRow[];
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

/**
 * Every SPELLING an IRI-shaped glob may be written against, mapped to the one
 * entity it addresses.
 *
 * An entity under a registered prefix has two legal spellings — the compact
 * `ds:button` shell completion offers, and the absolute
 * `https://ds.canonical.com/button` a user pastes from a browser. Both resolve
 * to the same entity in a literal lookup, so a glob must expand over both;
 * offering only the compact form made `https://ds.canonical.com/but*` return
 * EMPTY_RESULTS while the literal IRI it generalises succeeded.
 *
 * The map is spelling → CANONICAL IRI precisely so a pattern that matches an
 * entity under both spellings still yields it once. Matching over a flat list
 * of both would render the entity twice, which is why the previous shape
 * offered only one.
 */
async function listEntityIriSpellings(
  rt: LookupRuntime,
  lookup: PackLookup,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
): Promise<Map<string, string>> {
  const rows = await runSelect(rt, buildLookupIrisQuery(lookup), source);
  const spellings = new Map<string, string>();
  for (const row of rows) {
    const uri = row.uri ?? "";
    if (uri === "") continue;
    spellings.set(uri, uri);
    const compact = compactUri(uri, prefixes);
    if (compact !== uri) spellings.set(compact, uri);
  }
  return spellings;
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
