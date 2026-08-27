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
} from "./sparql/buildLookupQuery.js";
import { runSelect } from "./sparql/runSelect.js";
import type {
  PackChildRow,
  PackEntity,
  PackLookup,
  StorySource,
} from "./types.js";

/** A structured per-query lookup failure (never rejects the whole batch). */
export interface LookupError {
  readonly query: string;
  readonly code: string;
  readonly message: string;
  readonly suggestions?: readonly string[];
}

/** The result of a (possibly multi-name) lookup. */
export interface LookupOutput {
  readonly results: PackEntity[];
  readonly errors: LookupError[];
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
): Promise<LookupOutput> {
  if (queries.length === 0) {
    throw PragmaError.invalidInput("names", "(empty)", {
      recovery: cliRecovery(`${noun} list`, `List available ${noun} entries.`, {
        tool: `${noun}_list`,
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
  const settled = await Promise.allSettled(
    expanded.names.map((query) =>
      lookupOne(rt, lookup, noun, query, source, prefixes, level),
    ),
  );
  for (const [index, outcome] of settled.entries()) {
    const query = expanded.names[index];
    if (query === undefined) continue;
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
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
  return { results, errors };
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

/** Look up one entity, dispatching to the pack's declared fetch source. */
async function lookupOne(
  rt: LookupRuntime,
  lookup: PackLookup,
  noun: string,
  query: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
): Promise<PackEntity> {
  const graphqlSourced = lookup.source === "graphql";
  const rows = await runSelect(
    rt,
    buildResolveQuery(lookup, query, prefixes, level),
    source,
  );
  const base = rows.at(0);
  if (!base?.uri) {
    const candidates = await listEntityNames(rt, lookup, source);
    throw PragmaError.notFound(noun, query, {
      suggestions: suggestNames(query, candidates),
      recovery: cliRecovery(`${noun} list`, `List available ${noun} entries.`, {
        tool: `${noun}_list`,
      }),
    });
  }

  if (graphqlSourced) {
    return fetchGraphqlLookup(
      rt,
      lookup,
      base.uri,
      base.name ?? query,
      // The GraphQL lane's only use of the source is CONFIG_ERROR attribution,
      // which is right for any origin — so it takes the label, not provenance.
      source.label,
      prefixes,
      level,
    );
  }

  const entity: PackEntity = { ...base };
  for (const expand of activeExpands(lookup, level)) {
    entity[expand.name] = (await runSelect(
      rt,
      buildExpandQuery(expand, base.uri),
      source,
    )) as readonly PackChildRow[];
  }
  return entity;
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
): string {
  const graphqlSourced = lookup.source === "graphql";
  if (!looksLikeIri(query)) {
    return graphqlSourced
      ? buildNameResolveQuery(lookup, query)
      : buildLookupQuery(lookup, query, level);
  }
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
