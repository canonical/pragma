/**
 * The shared run bodies a compiled pack verb closes over.
 *
 * Each factory returns a `VerbSpec.run` closure. Reads are plain async: the list
 * body runs the pack's SELECT then applies post-query filters/search; the lookup
 * body resolves names → IRIs and fetches per the declared source, gated by the
 * resolved disclosure level; the sample body draws N random entities at the
 * highest level. All store access is through the runtime facade (lazy), so these
 * factories carry no heavy static import.
 */

import { cliRecovery, PragmaError } from "../error/index.js";
import type { PragmaRuntime } from "../runtime/index.js";
import { resolvePackDetail } from "./disclosure.js";
import type { SampleOutput } from "./renderPack.js";
import {
  type LookupOutput,
  listEntityNames,
  resolveLookup,
} from "./resolveEntity.js";
import { parseSampleCount, pickRandom } from "./sample.js";
import {
  applyPackFilters,
  type FilterVocabularies,
} from "./sparql/applyFilters.js";
import { applyPackSearch } from "./sparql/applySearch.js";
import { runSelect } from "./sparql/runSelect.js";
import type {
  PackFilter,
  PackList,
  PackLookup,
  PackRow,
  StorySource,
} from "./types.js";

/** The highest canonical level — sample fetches everything for shape discovery. */
const HIGHEST_LEVEL = "detailed";

/**
 * The recovery every lookup-shaped miss carries: browse the noun's list.
 *
 * `mcp.params` is populated rather than left off. A bare tool NAME is only half
 * an instruction to an agent — it still has to guess an argument bag, and a
 * guess that misses returns `-32602 Invalid arguments`, which reads like the
 * recovery itself was wrong. `{}` is the concrete, valid call: every compiled
 * list verb's params are optional, so the recovery is now copy-pasteable.
 */
function listRecovery(noun: string) {
  return cliRecovery(`${noun} list`, `List available ${noun} entries.`, {
    tool: `${noun}_list`,
    params: {},
  });
}

/** Facts a list-shaped run body needs beyond its `shape`. */
export interface ListRunMeta {
  readonly source: StorySource;
}

/**
 * Build the run body for a list-shaped verb (`list` or an extra verb).
 *
 * Zero rows is a plain empty list — a SUCCESS, not an error. It returns `[]`
 * (JSON stays `[]`, exit 0); the formatter turns the emptiness into a non-blank
 * message (a pack's `emptyRecovery` becomes that message's hint). Routing zero
 * results through EMPTY_RESULTS would map to exit 1 and break the uniform
 * `ok:true` list contract, so the run body never throws on emptiness.
 */
export function makeListRun(
  shape: PackList,
  meta: ListRunMeta,
): (params: Record<string, unknown>, rt: PragmaRuntime) => Promise<PackRow[]> {
  return async (params, rt) => {
    const rows = await runSelect(rt, shape.query, meta.source);
    const vocabularies = await readFilterVocabularies(
      rt,
      shape.filters,
      params,
      meta.source,
    );
    return applyPackSearch(
      applyPackFilters(rows, shape.filters, params, vocabularies),
      shape.search,
      params,
    );
  };
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

/** Build the run body for a lookup verb (variadic names → resolved entities). */
export function makeLookupRun(
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
): (
  params: Record<string, unknown>,
  rt: PragmaRuntime,
) => Promise<LookupOutput> {
  return async (params, rt) => {
    const names = readNames(params);
    const level = await resolvePackDetail(rt, lookup.disclosure);
    const output = await resolveLookup(
      rt,
      lookup,
      noun,
      names,
      source,
      prefixes,
      level,
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
          recovery: listRecovery(noun),
        });
      }
    }
    return output;
  };
}

/** Build the run body for a sample verb (N random entities at the highest level). */
export function makeSampleRun(
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  defaultCount: number,
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
        recovery: listRecovery(noun),
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
