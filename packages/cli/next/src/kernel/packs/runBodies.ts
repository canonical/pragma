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

import { PragmaError } from "../error/PragmaError.js";
import type { PragmaRuntime } from "../runtime/types.js";
import { resolvePackDetail } from "./disclosure.js";
import type { SampleOutput } from "./renderPack.js";
import {
  type LookupOutput,
  listEntityNames,
  resolveLookup,
} from "./resolveEntity.js";
import { parseSampleCount, pickRandom } from "./sample.js";
import { applyPackFilters } from "./sparql/applyFilters.js";
import { applyPackSearch } from "./sparql/applySearch.js";
import { runSelect } from "./sparql/runSelect.js";
import type { PackList, PackLookup, PackRow } from "./types.js";

/** The highest canonical level — sample fetches everything for shape discovery. */
const HIGHEST_LEVEL = "detailed";

/** Facts a list-shaped run body needs beyond its `shape`. */
export interface ListRunMeta {
  readonly noun: string;
  readonly source: string;
}

/** Build the run body for a list-shaped verb (`list` or an extra verb). */
export function makeListRun(
  shape: PackList,
  meta: ListRunMeta,
): (params: Record<string, unknown>, rt: PragmaRuntime) => Promise<PackRow[]> {
  return async (params, rt) => {
    const rows = applyPackSearch(
      applyPackFilters(
        await runSelect(rt, shape.query, meta.source),
        shape.filters,
        params,
      ),
      shape.search,
      params,
    );
    if (rows.length === 0) {
      const error = buildListEmptyError(meta.noun, shape, params);
      if (error) throw error;
    }
    return rows;
  };
}

/** Build the run body for a lookup verb (variadic names → resolved entities). */
export function makeLookupRun(
  lookup: PackLookup,
  noun: string,
  source: string,
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
          recovery: {
            message: `List available ${noun} entries.`,
            cli: `pragma ${noun} list`,
            mcp: { tool: `${noun}_list` },
          },
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
  source: string,
  prefixes: Readonly<Record<string, string>>,
  defaultCount: number,
): (
  params: Record<string, unknown>,
  rt: PragmaRuntime,
) => Promise<SampleOutput> {
  return async (params, rt) => {
    const count = parseSampleCount(params.count ?? defaultCount);
    const names = await listEntityNames(rt, lookup, source);
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

/**
 * The typed empty-list error for a pack list, or `undefined` when the emptiness
 * should render as a plain empty list. A value-constrained filter active ⇒ the
 * filter is the likely cause (re-list unfiltered); otherwise the pack's declared
 * `emptyRecovery` applies when authored, else `[]` stands.
 */
function buildListEmptyError(
  noun: string,
  shape: PackList,
  params: Record<string, unknown>,
): PragmaError | undefined {
  const applied = (shape.filters ?? []).filter(
    (filter) =>
      filter.values !== undefined && typeof params[filter.param] === "string",
  );
  if (applied.length > 0) {
    return PragmaError.emptyResults(noun, {
      filters: Object.fromEntries(
        applied.map((filter) => [filter.param, String(params[filter.param])]),
      ),
      recovery: {
        message: `List all ${noun} entries without filters.`,
        cli: `pragma ${noun} list`,
        mcp: { tool: `${noun}_list` },
      },
    });
  }
  if (shape.emptyRecovery) {
    return PragmaError.emptyResults(noun, { recovery: shape.emptyRecovery });
  }
  return undefined;
}
