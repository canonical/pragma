/**
 * THE single pack compiler: one validated {@link PackDefinition} → a set of
 * {@link VerbSpec}s, projected by the CLI and MCP projectors like any other
 * verb. This closes fork F3 (two pack compilers → one) — `list`, extra
 * list-shaped verbs, `lookup`, and `sample` all compile here, and the fetch
 * source (`sparql`/`graphql`) is a run-body detail invisible to the projectors.
 *
 * Pure, storeless spec-generation: it builds paths, params, formatters, and run
 * closures without touching the store or zod, so it runs on the
 * `--help`/`__complete` fast path (the bundled packs compile at import; the
 * dynamic merge is `collect.assembleEffectiveModules`/`loadEffectiveModules`).
 * The heavy work is deferred into the run closures (behind the lazy runtime
 * facade).
 */

import type { PragmaRuntime } from "../runtime/types.js";
import { asVerb } from "../spec/asVerb.js";
import type { DisclosureSpec, ParamSpec, VerbSpec } from "../spec/types.js";
import {
  listFormatters,
  lookupFormatters,
  type SampleOutput,
  sampleFormatters,
} from "./renderPack.js";
import type { LookupOutput } from "./resolveEntity.js";
import {
  MAX_SAMPLE_COUNT,
  MIN_SAMPLE_COUNT,
  sampleDefaultCount,
} from "./sample.js";
import type {
  PackDefinition,
  PackFilter,
  PackList,
  PackLookup,
  PackRow,
  PackSearch,
} from "./types.js";

// The run bodies pull the SPARQL/GraphQL fetch layer; they are dynamic-imported
// per invocation so `compilePack` (reached on the storeless --help/__complete
// fast path via capabilities/index) never statically loads them.
const runBodies = () => import("./runBodies.js");

/** The read capability every pack verb carries (store-backed, exposed to MCP). */
const READ_CAPABILITY = {
  needsStore: true,
  mutates: false,
  mcp: {
    expose: true as const,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
};

/**
 * Compile a validated pack definition into its verbs.
 *
 * @param definition - A validated pack definition.
 * @param source - Where the definition came from, for diagnostics.
 * @param prefixes - The merged prefix map used for display compaction.
 * @returns The compiled verbs (list, extra verbs, lookup, sample), in order.
 */
export function compilePack(
  definition: PackDefinition,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): VerbSpec[] {
  const { noun } = definition;
  const verbs: VerbSpec[] = [];

  if (definition.list) {
    verbs.push(
      compileListVerb(definition.list, {
        noun,
        verb: "list",
        summary: definition.description ?? `List ${noun} entries.`,
        doc: definition.toolDescription,
        source,
        prefixes,
      }),
    );
  }

  for (const verb of definition.verbs ?? []) {
    verbs.push(
      compileListVerb(verb, {
        noun,
        verb: verb.verb,
        summary: verb.description ?? `List ${noun} ${verb.verb}.`,
        doc: verb.toolDescription,
        source,
        prefixes,
      }),
    );
  }

  if (definition.lookup) {
    verbs.push(compileLookupVerb(definition.lookup, noun, source, prefixes));
    if (definition.lookup.sample) {
      verbs.push(compileSampleVerb(definition.lookup, noun, source, prefixes));
    }
  }

  return verbs;
}

/** Presentation facts for one compiled list-shaped verb. */
interface ListVerbMeta {
  readonly noun: string;
  readonly verb: string;
  readonly summary: string;
  /** The authored MCP tool description (from `toolDescription`), if any. */
  readonly doc?: string;
  readonly source: string;
  readonly prefixes: Readonly<Record<string, string>>;
}

/** Compile the `list` verb or an extra list-shaped verb. */
function compileListVerb(shape: PackList, meta: ListVerbMeta): VerbSpec {
  const params = [
    ...projectFilters(shape.filters),
    ...projectSearch(shape.search),
  ];
  const filterExample = shape.filters?.find((f) => f.values !== undefined);
  const verb: VerbSpec<Record<string, unknown>, PackRow[]> = {
    path: [meta.noun, meta.verb],
    summary: meta.summary,
    ...(meta.doc ? { doc: meta.doc } : {}),
    params,
    output: {
      formatters: listFormatters(shape, {
        heading: `${capitalize(meta.noun)}${meta.verb === "list" ? "" : ` ${meta.verb}`}`,
        prefixes: meta.prefixes,
      }),
    },
    examples: [
      { cmd: `pragma ${meta.noun} ${meta.verb}` },
      ...(filterExample
        ? [
            {
              cmd: `pragma ${meta.noun} ${meta.verb} --${filterExample.param} ${quoteExample(
                filterExample.values?.at(0) ?? "",
              )}`,
            },
          ]
        : []),
      { cmd: `pragma ${meta.noun} ${meta.verb} --llm` },
    ],
    capability: READ_CAPABILITY,
    run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
      runBodies().then((m) =>
        m.makeListRun(shape, { noun: meta.noun, source: meta.source })(
          params,
          rt,
        ),
      ),
  };
  return asVerb(verb);
}

/** Compile the `lookup` verb (variadic names → resolved entities). */
function compileLookupVerb(
  lookup: PackLookup,
  noun: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): VerbSpec {
  const completeType = lookup.type ?? lookup.types?.at(0) ?? "";
  const nameParam: ParamSpec = {
    kind: "string[]",
    name: "name",
    doc: `${capitalize(noun)} names, prefixed names/IRIs, or glob patterns.`,
    positional: true,
    required: true,
    ...(completeType
      ? { complete: { kind: "entity" as const, type: completeType } }
      : {}),
  };
  const verb: VerbSpec<Record<string, unknown>, LookupOutput> = {
    path: [noun, "lookup"],
    summary:
      lookup.description ?? `Look up ${noun} details by name, IRI, or glob.`,
    ...(lookup.toolDescription ? { doc: lookup.toolDescription } : {}),
    params: [nameParam],
    output: { formatters: lookupFormatters(lookup, prefixes) },
    examples: [{ cmd: `pragma ${noun} lookup <name>` }],
    ...(lookup.disclosure
      ? { disclosure: disclosureSpec(lookup.disclosure) }
      : {}),
    capability: READ_CAPABILITY,
    run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
      runBodies().then((m) =>
        m.makeLookupRun(lookup, noun, source, prefixes)(params, rt),
      ),
  };
  return asVerb(verb);
}

/** Compile the `sample` verb (N random exemplars at the highest level). */
function compileSampleVerb(
  lookup: PackLookup,
  noun: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): VerbSpec {
  const defaultCount = sampleDefaultCount(lookup);
  const config = lookup.sample === true ? undefined : lookup.sample;
  // Most samples take a `[count]` positional; where the covenant freezes a
  // no-argument sample the pack sets `fixedCount`, so the compiler omits it and
  // the sample always returns the default count.
  const countParam: ParamSpec[] = config?.fixedCount
    ? []
    : [
        {
          kind: "string",
          name: "count",
          doc: `Number of samples (${MIN_SAMPLE_COUNT}–${MAX_SAMPLE_COUNT}, default ${defaultCount}).`,
          positional: true,
        },
      ];
  const verb: VerbSpec<Record<string, unknown>, SampleOutput> = {
    path: [noun, "sample"],
    summary:
      config?.description ??
      `Return randomly selected complete ${noun} entries as exemplars.`,
    ...(config?.toolDescription ? { doc: config.toolDescription } : {}),
    params: countParam,
    output: { formatters: sampleFormatters(lookup, noun, prefixes) },
    examples: [
      { cmd: `pragma ${noun} sample` },
      ...(config?.fixedCount ? [] : [{ cmd: `pragma ${noun} sample 3` }]),
    ],
    capability: READ_CAPABILITY,
    run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
      runBodies().then((m) =>
        m.makeSampleRun(
          lookup,
          noun,
          source,
          prefixes,
          defaultCount,
        )(params, rt),
      ),
  };
  return asVerb(verb);
}

/** Normalize a pack disclosure into a {@link DisclosureSpec} (default → base). */
function disclosureSpec(disclosure: PackLookup["disclosure"]): DisclosureSpec {
  const levels = disclosure?.levels ?? [];
  return {
    levels: [...levels],
    default: disclosure?.default ?? levels[0] ?? "summary",
  };
}

/** Project declared filters onto verb params (enum for a value set, else string). */
function projectFilters(
  filters: readonly PackFilter[] | undefined,
): ParamSpec[] {
  return (filters ?? []).map((filter) => {
    const doc =
      filter.description ??
      (filter.values
        ? `Filter by ${filter.variable} (${filter.values.join(", ")}).`
        : `Filter by ${filter.variable}.`);
    if (filter.values) {
      return {
        kind: "enum",
        name: filter.param,
        doc,
        values: [...filter.values],
      } satisfies ParamSpec;
    }
    return { kind: "string", name: filter.param, doc } satisfies ParamSpec;
  });
}

/** Project a declared free-text search onto the `search` param. */
function projectSearch(search: PackSearch | undefined): ParamSpec[] {
  if (!search) return [];
  return [
    {
      kind: "string",
      name: "search",
      doc: search.description ?? `Search in ${search.variables.join(", ")}.`,
    },
  ];
}

/** Quote a filter example value when it is not a bare word. */
function quoteExample(value: string): string {
  return /^[\w.-]+$/.test(value) ? value : JSON.stringify(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Re-export the definition type for the compiled-module barrels. */
export type { PackDefinition };
