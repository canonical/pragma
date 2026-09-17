/**
 * The shared run bodies a compiled pack verb closes over.
 *
 * Each factory returns a `VerbSpec.run` closure. Reads are plain async: the list
 * body admits the caller's filter values against the graph's vocabulary, then
 * runs ONE generated SELECT that carries the filters, the search and the page's
 * bounds; the lookup body resolves names → IRIs and fetches per the declared
 * source, gated by the resolved disclosure level; the sample body draws N random
 * entities at the highest level. All store access is through the runtime facade
 * (lazy), so these factories carry no heavy static import.
 */

import { PragmaError } from "../error/index.js";
import type { PragmaRuntime } from "../runtime/index.js";
import { encodeCursor, pageFingerprint, readCursor } from "./cursor.js";
import { resolvePackDetail } from "./disclosure.js";
import { readLimit } from "./paging.js";
import type { SampleOutput } from "./renderPack.js";
import {
  type LookupOutput,
  type LookupScope,
  listEntityNames,
  listRecovery,
  resolveLookup,
} from "./resolveEntity.js";
import { parseSampleCount, pickRandom } from "./sample.js";
import {
  buildListQuery,
  buildTierCountQuery,
  type ListTierScope,
  TIER_COUNT_ROWS,
  TIER_COUNT_TIER,
} from "./sparql/buildListQuery.js";
import {
  type FilterVocabularies,
  resolveFilterPredicates,
} from "./sparql/filterValues.js";
import { runSelect } from "./sparql/runSelect.js";
import { readSearchTerm } from "./sparql/searchTerm.js";
import {
  localName,
  resolveReadScope,
  scopeIris,
  scopeLabel,
  type TierScope,
} from "./tierScope.js";
import {
  ENTITY_VARIABLE,
  type PackAppliedFilter,
  type PackFilter,
  type PackList,
  type PackLookup,
  type PackPage,
  type PackTierScope,
  type PageTierScope,
  type StorySource,
} from "./types.js";

/** The highest canonical level — sample fetches everything for shape discovery. */
const HIGHEST_LEVEL = "detailed";

/** Facts a list-shaped run body needs beyond its `shape`. */
export interface ListRunMeta {
  readonly source: StorySource;
  /**
   * The noun's declared tier hierarchy, when its entities are tiered: the list
   * is then narrowed to a tier scope, compiled into the same query the filters
   * are. Absent leaves the read exactly as it was.
   */
  readonly tierScope?: PackTierScope;
}

/**
 * Build the run body for a list-shaped verb (`list` or an extra verb).
 *
 * Zero rows is a plain empty list — a SUCCESS, not an error. It returns an
 * empty page (JSON stays `[]`, exit 0); the formatter turns the emptiness into
 * a non-blank message (a pack's `emptyRecovery` becomes that message's hint).
 * Routing zero results through EMPTY_RESULTS would map to exit 1 and break the
 * uniform `ok:true` list contract, so the run body never throws on emptiness.
 * An empty PAGE is the same calm answer: a caller who walked past the last row
 * asked a legitimate question and got a legitimate nothing.
 *
 * `limit + 1` rows are asked for and at most `limit` returned. That extra row
 * is the whole "are there more" answer — a `COUNT` over the filtered
 * population would be a second full evaluation of the same query to learn one
 * boolean.
 */
export function makeListRun(
  shape: PackList,
  meta: ListRunMeta,
): (params: Record<string, unknown>, rt: PragmaRuntime) => Promise<PackPage> {
  return async (params, rt) => {
    const vocabularies = await readFilterVocabularies(
      rt,
      shape.filters,
      params,
      meta.source,
    );
    const predicates = resolveFilterPredicates(
      shape.filters,
      params,
      vocabularies,
      meta.source.label,
    );
    const search = readSearchTerm(shape.search, params);
    const scope = await resolveReadScope(
      rt,
      meta.tierScope,
      params.tier,
      meta.source,
    );
    // The scope as the query builder takes it, or nothing: a story with no
    // declared hierarchy, and a read that asked for every tier, both compile
    // the query they always did.
    const tiers = scope ? scopeIris(scope) : [];
    const listScope =
      meta.tierScope && tiers.length > 0
        ? { entity: ENTITY_VARIABLE, via: meta.tierScope.via, tiers }
        : undefined;
    const limit = readLimit(params.limit);
    // The cursor is spendable only on the read that issued it, and the read IS
    // the author query plus the admitted arguments — the tier scope among them.
    // A cursor minted under one scope and spent under another would page
    // through a population it was not cut from, which is the same defect the
    // fingerprint exists to prevent for filters.
    const fingerprint = pageFingerprint([
      shape.query,
      JSON.stringify(predicates),
      JSON.stringify(search ?? null),
      // Only when there IS a scope: the fingerprint names the read, and an
      // unscoped read has no scope to name. Adding an empty one unconditionally
      // would re-hash every cursor every unscoped story has ever issued, for a
      // component that says nothing about them.
      ...(listScope ? [JSON.stringify(tiers)] : []),
    ]);
    const offset = readCursor(params.after, fingerprint);
    const read = {
      query: shape.query,
      predicates,
      ...(search ? { search } : {}),
      label: meta.source.label,
    };
    const rows = await runSelect(
      rt,
      buildListQuery({
        ...read,
        ...(listScope ? { scope: listScope } : {}),
        window: { limit: limit + 1, offset },
      }),
      meta.source,
    );
    const breakdown =
      scope?.kind === "tiers" && listScope
        ? await readTierCounts(rt, { ...read, scope: listScope }, meta.source)
        : undefined;
    const hasMore = rows.length > limit;
    const applied = appliedFilters(shape, params, search?.term, scope);
    return {
      rows: hasMore ? rows.slice(0, limit) : rows,
      ...(hasMore
        ? { nextAfter: encodeCursor(offset + limit, fingerprint) }
        : {}),
      ...(applied.length > 0 ? { filters: applied } : {}),
      ...(scope?.kind === "tiers"
        ? {
            scope: {
              tiers: scope.tiers.map((tier) => tier.local),
              ...breakdown,
            },
          }
        : {}),
      limit,
    };
  };
}

/**
 * Count the whole filtered answer per tier, for a scoped page's heading.
 *
 * One aggregate over the same wrapped query the page ran
 * ({@link buildTierCountQuery}), never a join into the page: the rows a caller
 * pages through stay exactly the rows the story's query returns.
 *
 * @returns `counts` with every in-scope tier (0 when it holds none) ahead of
 *   the out-of-scope tiers that hold some, and `untiered` when any row's entity
 *   is in no tier.
 */
async function readTierCounts(
  rt: PragmaRuntime,
  read: Parameters<typeof buildTierCountQuery>[0] & { scope: ListTierScope },
  source: StorySource,
): Promise<Pick<PageTierScope, "counts" | "untiered">> {
  const rows = await runSelect(rt, buildTierCountQuery(read), source);
  const byIri = new Map(
    rows.map((row) => [
      row[TIER_COUNT_TIER] ?? "",
      Number(row[TIER_COUNT_ROWS]),
    ]),
  );
  const inScope = read.scope.tiers.map(
    (iri) => [localName(iri), byIri.get(iri) ?? 0] as const,
  );
  const outside = [...byIri]
    .filter(([iri]) => iri !== "" && !read.scope.tiers.includes(iri))
    .map(([iri, count]) => [localName(iri), count] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  const untiered = byIri.get("") ?? 0;
  return {
    counts: Object.fromEntries([...inScope, ...outside]),
    ...(untiered > 0 ? { untiered } : {}),
  };
}

/**
 * The filters this read was narrowed by, in the spelling the caller used.
 *
 * Read off the DECLARED filters and the search term rather than off the
 * compiled predicates: what an empty answer has to name is the argument a
 * reader typed (`--search zzzznotreal`), not the query variable it bound to.
 * A repeated flag accumulates into an array; it is joined here so the renderer
 * never has to know that.
 *
 * A per-call `--tier` counts as one of them, and a CONFIGURED or default scope
 * does not. The distinction is the one this list exists to draw: these are the
 * arguments a reader TYPED, so an empty answer can hand them back as flags to
 * edit. A scope nobody asked for is reported by the page's own `scope` instead,
 * which every format states in its own register.
 *
 * @param shape - The story's list shape (its declared filters).
 * @param params - The arguments this invocation supplied.
 * @param search - The normalised search term, when the caller supplied one.
 * @param scope - The tier scope in force, when the noun is tiered.
 * @returns One entry per filter in force, in declared order, search last.
 */
function appliedFilters(
  shape: PackList,
  params: Record<string, unknown>,
  search: string | undefined,
  scope: TierScope | undefined,
): PackAppliedFilter[] {
  const applied: PackAppliedFilter[] = [];
  for (const filter of shape.filters ?? []) {
    const provided = params[filter.param];
    if (provided === undefined) continue;
    const value = Array.isArray(provided)
      ? provided.map(String).join(", ")
      : String(provided);
    if (value === "") continue;
    applied.push({ param: filter.param, value });
  }
  if (search !== undefined) applied.push({ param: "search", value: search });
  if (scope !== undefined && typeof params.tier === "string") {
    const value = params.tier.trim();
    if (value !== "") applied.push({ param: "tier", value });
  }
  return applied;
}

/**
 * Read the declared vocabulary of each value-free filter the caller actually
 * used.
 *
 * WHY a second query rather than the rows already in hand: the rows are a
 * population, not a vocabulary. A category the graph declares with no standards
 * filed under it, or a `ds:ConceptType` no concept uses yet, is a REAL value
 * that appears in no row — and rejecting it as `INVALID_INPUT` contradicts both
 * `standard categories` (which lists it, with count 0) and the documented calm
 * empty list. The query reads the same terms the enumerating surface reads, so
 * "the graph is the vocabulary" stays true of the graph rather than of whatever
 * the list happened to return.
 *
 * Only for a filter that is DECLARED with a vocabulary, carries no `values`
 * (a declared set is already the vocabulary), and was actually PROVIDED — an
 * unfiltered `list` runs exactly the one query it always did.
 */
async function readFilterVocabularies(
  rt: PragmaRuntime,
  filters: readonly PackFilter[] | undefined,
  params: Record<string, unknown>,
  source: StorySource,
): Promise<FilterVocabularies | undefined> {
  const needed = (filters ?? []).filter(
    (filter) =>
      filter.vocabulary !== undefined &&
      filter.values === undefined &&
      params[filter.param] !== undefined,
  );
  if (needed.length === 0) return undefined;
  const resolved = new Map<string, readonly string[]>();
  for (const filter of needed) {
    const vocabulary = filter.vocabulary;
    if (!vocabulary) continue;
    const variable = vocabulary.variable ?? filter.variable;
    const rows = await runSelect(rt, vocabulary.query, source);
    resolved.set(
      filter.param,
      rows.map((row) => row[variable] ?? "").filter((value) => value !== ""),
    );
  }
  return resolved;
}

/**
 * Build the run body for a lookup verb (variadic names → resolved entities).
 *
 * A TIERED noun's lookup carries the scope too, and it is the same scope its
 * list carries — one rule, so `block list` and `block lookup` cannot disagree
 * about which Button a reader means. What differs is what the scope DOES: a
 * list omits what is out of scope, a lookup prefers what is in it and falls
 * back rather than answering "no such block" about a block that exists
 * ({@link ./resolveEntity.applyScope}).
 */
export function makeLookupRun(
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  hasList: boolean,
  tierScope?: PackTierScope,
): (
  params: Record<string, unknown>,
  rt: PragmaRuntime,
) => Promise<LookupOutput> {
  return async (params, rt) => {
    const names = readNames(params);
    const level = await resolvePackDetail(rt, lookup.disclosure);
    const scope = await resolveReadScope(rt, tierScope, params.tier, source);
    const output = await resolveLookup(
      rt,
      lookup,
      noun,
      names,
      source,
      prefixes,
      level,
      hasList,
      lookupScope(tierScope, scope),
    );
    // A total miss (single or all-miss) exits non-zero; a partial batch renders
    // the results it found and notes the misses.
    if (output.results.length === 0 && output.errors.length > 0) {
      const first = output.errors[0];
      if (first) {
        throw new PragmaError({
          code: first.code as PragmaError["code"],
          message: first.message,
          suggestions: first.suggestions ? [...first.suggestions] : undefined,
          recovery: listRecovery(noun, hasList),
        });
      }
    }
    return output;
  };
}

/**
 * The resolver's view of a scope, or `undefined` when there is nothing to
 * narrow by.
 *
 * `all` collapses to `undefined` rather than to an empty tier set: a resolver
 * handed an empty set would treat every match as out of scope and report a
 * fallback for a read that asked for every tier.
 */
function lookupScope(
  declaration: PackTierScope | undefined,
  scope: TierScope | undefined,
): LookupScope | undefined {
  if (!declaration || scope === undefined || scope.kind === "all") {
    return undefined;
  }
  const label = scopeLabel(scope);
  if (label === undefined) return undefined;
  return { via: declaration.via, tiers: scopeIris(scope), label };
}

/**
 * Build the run body for a sample verb (N random entities at the highest level).
 *
 * UNSCOPED, deliberately, and it is the one read of a tiered noun that is. A
 * sample is a shape probe — "show me what a block record looks like" — drawn at
 * the highest disclosure level for exactly that reason, and the tier a specimen
 * happens to belong to is not part of the shape. Narrowing it would also make
 * the draw pool depend on a setting, so two agents reading the same store would
 * see different exemplars for reasons neither asked about.
 */
export function makeSampleRun(
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  defaultCount: number,
  hasList: boolean,
): (
  params: Record<string, unknown>,
  rt: PragmaRuntime,
) => Promise<SampleOutput> {
  return async (params, rt) => {
    const count = parseSampleCount(params.count ?? defaultCount);
    const names = await listEntityNames(rt, lookup, source);
    // An empty population is a clean EMPTY_RESULTS (nothing to sample), not the
    // "(empty)" INVALID_INPUT resolveLookup would raise on a zero-length batch.
    if (names.length === 0) {
      throw PragmaError.emptyResults(noun, {
        message: `No ${noun} entries to sample.`,
        recovery: listRecovery(noun, hasList),
      });
    }
    const selected = pickRandom(names, count);
    const output = await resolveLookup(
      rt,
      lookup,
      noun,
      selected,
      source,
      prefixes,
      HIGHEST_LEVEL,
      hasList,
    );
    return {
      samples: output.results,
      totalCount: names.length,
      nextSteps: [
        `These are ${output.results.length} of ${names.length} total ${noun} entries.`,
        `Use ${noun}_lookup to inspect specific entries by name.`,
        `Use ${noun}_list to browse all entries.`,
      ],
    };
  };
}

/** Read the variadic `name` positional as a string array. */
function readNames(params: Record<string, unknown>): string[] {
  const raw = params.name;
  if (Array.isArray(raw))
    return raw.filter((n): n is string => typeof n === "string");
  return typeof raw === "string" ? [raw] : [];
}
