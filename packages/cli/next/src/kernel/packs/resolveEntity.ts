/**
 * Look up one or more pack entities by name, prefixed name, absolute IRI, or
 * glob, via the fetch strategy the pack declares.
 *
 * The name→URI resolve is ALWAYS generated SPARQL (an escaped literal or a
 * validated `<iri>` BIND) regardless of `source`; from the resolved IRI, values
 * are fetched either through more generated SELECTs (`sparql`) or one generated
 * GraphQL document (`graphql`). One poisoned query never discards the batch —
 * per-query failures are collected as structured error entries.
 *
 * Reached only behind a dynamic import from the lookup run body, so its imports
 * (including the GraphQL path) stay off the storeless fast path.
 */

import { PragmaError } from "../error/PragmaError.js";
import { suggestNames } from "../project/cli/suggestNames.js";
import type { PragmaRuntime } from "../runtime/types.js";
import { activeExpands } from "./disclosure.js";
import { expandGlob, isGlobPattern } from "./glob.js";
import { fetchGraphqlLookup } from "./graphql/fetchGraphqlLookup.js";
import { isEmbeddableIri, resolveUri } from "./iri.js";
import {
  buildExpandQuery,
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildLookupQuery,
  buildNameResolveQuery,
} from "./sparql/buildLookupQuery.js";
import { runSelect } from "./sparql/runSelect.js";
import type { PackChildRow, PackEntity, PackLookup } from "./types.js";

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
  source: string,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
): Promise<LookupOutput> {
  if (queries.length === 0) {
    throw PragmaError.invalidInput("names", "(empty)", {
      recovery: {
        message: `List available ${noun} entries.`,
        cli: `pragma ${noun} list`,
        mcp: { tool: `${noun}_list` },
      },
    });
  }

  const expanded = await expandQueries(rt, lookup, noun, source, queries);
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

/** Expand glob queries against the entity name list; literals pass through. */
async function expandQueries(
  rt: LookupRuntime,
  lookup: PackLookup,
  noun: string,
  source: string,
  queries: readonly string[],
): Promise<{ names: string[]; globErrors: LookupError[] }> {
  if (!queries.some(isGlobPattern))
    return { names: [...queries], globErrors: [] };
  const allNames = await listEntityNames(rt, lookup, source);
  const names: string[] = [];
  const globErrors: LookupError[] = [];
  for (const query of queries) {
    if (!isGlobPattern(query)) {
      names.push(query);
      continue;
    }
    const matches = expandGlob(query, allNames);
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
  source: string,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
): Promise<PackEntity> {
  const graphqlSourced = lookup.source === "graphql";
  const rows = await runSelect(
    rt,
    graphqlSourced
      ? buildNameResolveQuery(lookup, query)
      : buildEntityQuery(lookup, query, prefixes, level),
    source,
  );
  const base = rows.at(0);
  if (!base?.uri) {
    const candidates = await listEntityNames(rt, lookup, source);
    throw PragmaError.notFound(noun, query, {
      suggestions: suggestNames(query, candidates),
      recovery: {
        message: `List available ${noun} entries.`,
        cli: `pragma ${noun} list`,
        mcp: { tool: `${noun}_list` },
      },
    });
  }

  if (graphqlSourced) {
    return fetchGraphqlLookup(
      rt,
      lookup,
      base.uri,
      base.name ?? query,
      source,
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

/** Build the base entity SELECT for the SPARQL path (name or IRI form). */
function buildEntityQuery(
  lookup: PackLookup,
  query: string,
  prefixes: Readonly<Record<string, string>>,
  level: string | undefined,
): string {
  if (!looksLikeIri(query)) return buildLookupQuery(lookup, query, level);
  const resolved = resolveUri(query, prefixes);
  if (!isEmbeddableIri(resolved)) {
    throw PragmaError.invalidInput("name", query, {
      recovery: {
        message:
          "Use an absolute IRI (https://…), a prefixed name (ds:thing), or a plain entity name.",
      },
    });
  }
  return buildLookupByIriQuery(lookup, resolved, level);
}

/** Whether a lookup query addresses an entity by IRI or prefixed name. */
function looksLikeIri(query: string): boolean {
  return (
    query.startsWith("http://") ||
    query.startsWith("https://") ||
    query.includes(":")
  );
}

/** List every entity name the lookup can address (miss suggestions + sample/glob). */
export async function listEntityNames(
  rt: LookupRuntime,
  lookup: PackLookup,
  source: string,
): Promise<string[]> {
  const rows = await runSelect(rt, buildLookupNamesQuery(lookup), source);
  return rows.map((row) => row.name ?? "").filter((name) => name !== "");
}
