/**
 * THE single pack compiler: one validated {@link PackDefinition} → a set of
 * {@link VerbSpec}s, projected by the CLI and MCP projectors like any other
 * verb. This closes fork F3 (two pack compilers → one) — `list`, extra
 * list-shaped verbs, `lookup`, and `sample` all compile here, and the fetch
 * source (`sparql`/`graphql`) is a run-body detail invisible to the projectors.
 *
 * Pure, storeless spec-generation: it builds paths, params, formatters, and run
 * closures without touching the store or zod, so it runs on the
 * `--help`/`__complete` fast path (the distribution's declared stories compile
 * at import, in `capabilities/distribution.ts`; the dynamic merge is
 * `collect.assembleEffectiveModules`/`loadEffectiveModules`).
 * The heavy work is deferred into the run closures (behind the lazy runtime
 * facade).
 */

import { BIN_NAME, DETAIL_LEVELS } from "../../constants.js";
import { PragmaError } from "../error/index.js";
import { compactUri, DEFAULT_PREFIX_MAP } from "../render/index.js";
import type { PragmaRuntime } from "../runtime/index.js";
import { asVerb } from "../spec/asVerb.js";
import type {
  CapabilityModule,
  DisclosureSpec,
  McpListable,
  ParamSpec,
  VerbSpec,
} from "../spec/types.js";
import { DEFAULT_LIST_LIMIT, MAX_LIST_WINDOW } from "./paging.js";
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
import { storyIssues } from "./storyRules.js";
import {
  EVERY_TIER,
  type PackDefinition,
  type PackFilter,
  type PackGuidance,
  type PackList,
  type PackLookup,
  type PackPage,
  type PackSearch,
  type PackTierScope,
  type StorySource,
  TIER_PARAM,
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
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
): VerbSpec[] {
  const { noun } = definition;
  const verbs: VerbSpec[] = [];

  const tierScope = definition.tierScope;
  // A story may declare a lookup alone; a miss must not point at a `list` it lacks.
  const hasList = definition.list !== undefined;

  if (definition.list) {
    verbs.push(
      compileListVerb(definition.list, {
        noun,
        verb: "list",
        summary: definition.description ?? `List ${noun} entries.`,
        doc: definition.toolDescription,
        ...guidanceOf(definition),
        source,
        prefixes,
        ...(tierScope ? { tierScope } : {}),
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
        ...guidanceOf(verb),
        source,
        prefixes,
        ...(tierScope ? { tierScope } : {}),
      }),
    );
  }

  if (definition.lookup) {
    // Normalised ONCE, here, so the lookup verb, its run body, both fetch lanes
    // and the sample all read the same declaration.
    const lookup = withDisclosure(definition.lookup);
    verbs.push(
      compileLookupVerb(lookup, noun, source, prefixes, hasList, tierScope),
    );
    if (lookup.sample) {
      verbs.push(compileSampleVerb(lookup, noun, source, prefixes, hasList));
    }
  }

  return verbs;
}

/**
 * Derive a story's MCP resource listing from the types its lookup addresses.
 *
 * ZERO new authoring: a read story ALREADY declares its type set
 * (`lookup.type` / `lookup.types`) because that is what its name resolve is
 * constrained by, so the slice of the index the noun contributes to the listing
 * IS that declaration read a second time by a different reader — never written
 * a second time by the author. Each type contributes ONE collection entry (its
 * class entry, carrying the instance count); the individuals stay reachable
 * through the `{+uri}` template and its autocomplete.
 *
 * Returns `undefined` for a story with no lookup (a list-only noun addresses no
 * class, so it can name no slice).
 *
 * @param definition - A validated pack definition.
 * @returns Its declared listing, or `undefined` when it declares no types.
 */
export function compileListable(
  definition: PackDefinition,
): McpListable | undefined {
  const lookup = definition.lookup;
  if (!lookup) return undefined;
  const types = lookup.types ?? (lookup.type ? [lookup.type] : []);
  if (types.length === 0) return undefined;
  // `PackLookup.type`/`types` accept a prefixed name OR an absolute IRI, but the
  // listing is keyed on the index's PREFIXED types. Copied verbatim, a lookup
  // legitimately constrained to `https://…/Widget` compiles clean and then
  // matches no class and no weight — a story that is valid everywhere else and
  // silently contributes nothing here. Compacted against the same map
  // `resolveUri` expands with, so the two directions agree.
  const compact = (type: string): string =>
    compactUri(type, DEFAULT_PREFIX_MAP);
  const weights = Object.fromEntries(
    Object.entries(lookup.weights ?? {}).map(([type, weight]) => [
      compact(type),
      weight,
    ]),
  );
  return {
    sources: types.map(compact).map((type) => ({
      type,
      as: "collection" as const,
      // Unlisted types weigh 1 — the default is "as important as any other",
      // so a story that declares no weights needs no weights.
      weight: weights[type] ?? 1,
    })),
  };
}

/**
 * Compile a story into the capability module that carries it.
 *
 * The ONE place a {@link PackDefinition} becomes a {@link CapabilityModule} —
 * the distribution's static stories and the dynamic (config/package) ones come
 * through here alike, so a module-level projection derived from the story
 * (today: {@link compileListable}) cannot reach one tier and miss the other.
 *
 * That door is also where the COMPILABILITY rules are checked
 * ({@link ./storyRules.storyIssues}), for the same reason. The zod grammar runs
 * for config- and package-declared stories only, so a rule stated only there
 * was a declaration-time refusal for a third-party author and a first-call
 * CONFIG_ERROR for the distribution's own stories. The rules are pure string
 * work over text the story already carries, which is what makes them affordable
 * on this path; a story that passed zod has passed them already, so the throw
 * below is reachable only for a story that never saw zod.
 *
 * @param definition - A validated pack definition.
 * @param source - Where the definition came from, for diagnostics.
 * @param prefixes - The merged prefix map used for display compaction.
 * @returns The module: the compiled verbs plus the story's module-level data.
 * @throws PragmaError CONFIG_ERROR when the definition cannot be compiled,
 *   naming the field and the rule.
 */
export function compileStoryModule(
  definition: PackDefinition,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
): CapabilityModule {
  const issue = storyIssues(definition)[0];
  if (issue) {
    throw PragmaError.configError(
      `Invalid story in ${source.label} at ${issue.path.join(".")}: ${issue.message}`,
    );
  }
  const listable = compileListable(definition);
  return {
    name: definition.noun,
    story: true,
    verbs: compilePack(definition, source, prefixes),
    colophon: definition.colophon,
    ...(listable ? { mcpListable: listable } : {}),
  };
}

/** Carry a story half's declared guidance onto its verb, omitting what is absent. */
function guidanceOf(half: PackGuidance): Pick<VerbSpec, "useWhen" | "example"> {
  return {
    ...(half.useWhen ? { useWhen: half.useWhen } : {}),
    ...(half.example ? { example: half.example } : {}),
  };
}

/** Presentation facts for one compiled list-shaped verb. */
interface ListVerbMeta extends PackGuidance {
  readonly noun: string;
  readonly verb: string;
  readonly summary: string;
  /** The authored MCP tool description (from `toolDescription`), if any. */
  readonly doc?: string;
  readonly source: StorySource;
  readonly prefixes: Readonly<Record<string, string>>;
  /** The noun's declared tier hierarchy, when its entities are tiered. */
  readonly tierScope?: PackTierScope;
}

/** Compile the `list` verb or an extra list-shaped verb. */
function compileListVerb(shape: PackList, meta: ListVerbMeta): VerbSpec {
  const params = [
    ...projectFilters(shape.filters),
    ...projectSearch(shape.search),
    ...tierParams(meta.tierScope),
    ...PAGE_PARAMS,
  ];
  const filterExample = shape.filters?.find((f) => f.values !== undefined);
  const verb: VerbSpec<Record<string, unknown>, PackPage> = {
    path: [meta.noun, meta.verb],
    summary: meta.summary,
    ...(meta.doc ? { doc: meta.doc } : {}),
    ...guidanceOf(meta),
    params,
    output: {
      formatters: listFormatters(shape, {
        heading: `${capitalize(meta.noun)}${meta.verb === "list" ? "" : ` ${meta.verb}`}`,
        noun: meta.noun,
        prefixes: meta.prefixes,
      }),
    },
    examples: [
      { cmd: `${BIN_NAME} ${meta.noun} ${meta.verb}` },
      ...(filterExample
        ? [
            {
              cmd: `${BIN_NAME} ${meta.noun} ${meta.verb} --${filterExample.param} ${quoteExample(
                filterExample.values?.at(0) ?? "",
              )}`,
            },
          ]
        : []),
      { cmd: `${BIN_NAME} ${meta.noun} ${meta.verb} --format llm` },
    ],
    capability: READ_CAPABILITY,
    run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
      runBodies().then((m) =>
        m.makeListRun(shape, {
          source: meta.source,
          ...(meta.tierScope ? { tierScope: meta.tierScope } : {}),
        })(params, rt),
      ),
  };
  return asVerb(verb);
}

/** Compile the `lookup` verb (variadic names → resolved entities). */
function compileLookupVerb(
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  hasList: boolean,
  tierScope?: PackTierScope,
): VerbSpec {
  // Derive-by-default: every lookup completes its `<name>` from the pack index
  // (empty type = any, the reader handles it), UNLESS the pack opts out
  // (`completion.enabled:false`). `match`/`minChars` tune the derived heuristic.
  const completeType = lookup.type ?? lookup.types?.at(0) ?? "";
  const completion = lookup.completion;
  const nameParam: ParamSpec = {
    kind: "string[]",
    name: "name",
    doc: `${capitalize(noun)} names, prefixed names/IRIs, or glob patterns.`,
    positional: true,
    required: true,
    ...(completion?.enabled === false
      ? {}
      : {
          complete: {
            kind: "names" as const,
            source: {
              from: "index" as const,
              ...(completeType ? { type: completeType } : {}),
            },
            ...(completion?.match ? { match: completion.match } : {}),
            ...(completion?.minChars !== undefined
              ? { minChars: completion.minChars }
              : {}),
          },
        }),
  };
  const verb: VerbSpec<Record<string, unknown>, LookupOutput> = {
    path: [noun, "lookup"],
    summary:
      lookup.description ?? `Look up ${noun} details by name, IRI, or glob.`,
    ...(lookup.toolDescription ? { doc: lookup.toolDescription } : {}),
    ...guidanceOf(lookup),
    params: [nameParam, ...tierParams(tierScope)],
    output: { formatters: lookupFormatters(lookup, prefixes) },
    examples: [
      { cmd: `${BIN_NAME} ${noun} lookup <name>` },
      ...(tierScope
        ? [
            {
              cmd: `${BIN_NAME} ${noun} lookup --tier all <name>`,
              note: "every tier, not just the ones in scope",
            },
          ]
        : []),
    ],
    disclosure: disclosureSpec(lookup.disclosure),
    capability: READ_CAPABILITY,
    run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
      runBodies().then((m) =>
        m.makeLookupRun(
          lookup,
          noun,
          source,
          prefixes,
          hasList,
          tierScope,
        )(params, rt),
      ),
  };
  return asVerb(verb);
}

/**
 * The `--tier` parameter a TIERED noun's reads carry (`tier` over MCP).
 *
 * Kernel-added, like the page: being tiered is declared, but the argument that
 * steers the scope is the kernel's to name — one spelling across every tiered
 * noun, so an agent that learned `--tier` on `block list` can use it on
 * `concept list` without asking. The help text names the default and the
 * escape, because a scope a caller cannot see is exactly the hidden behaviour
 * CONSTITUTION §VI rules out.
 *
 * Not `repeatable`: a repeated `--tier` would be two chains, and the scope is
 * one chain. The run body refuses an array rather than quietly taking the last.
 */
function tierParams(tierScope: PackTierScope | undefined): ParamSpec[] {
  if (!tierScope) return [];
  return [
    {
      kind: "string",
      name: TIER_PARAM,
      doc: `Read this tier and its ancestors (default: the top-level tiers; "${EVERY_TIER}" for every tier).`,
    },
  ];
}

/** Compile the `sample` verb (N random exemplars at the highest level). */
function compileSampleVerb(
  lookup: PackLookup,
  noun: string,
  source: StorySource,
  prefixes: Readonly<Record<string, string>>,
  hasList: boolean,
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
    ...guidanceOf(config ?? {}),
    params: countParam,
    output: { formatters: sampleFormatters(lookup, noun, prefixes) },
    examples: [
      { cmd: `${BIN_NAME} ${noun} sample` },
      ...(config?.fixedCount ? [] : [{ cmd: `${BIN_NAME} ${noun} sample 3` }]),
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
          hasList,
        )(params, rt),
      ),
  };
  return asVerb(verb);
}

/**
 * Give a lookup that declares no disclosure the canonical one, so EVERY lookup
 * can be asked for less.
 *
 * A lookup without levels answered with everything it had, and offered no
 * `detail` to say otherwise — which made the size of an answer a property of
 * which noun was asked rather than of what the caller wanted. The imputed
 * ladder is chosen so that declaring nothing still MEANS what it meant:
 *
 * - the default is the HIGHEST level, so the default answer is byte for byte
 *   the one the lookup gave before;
 * - an untagged expand is tagged `standard`. Expands are where an answer's
 *   bulk lives (a token's values at every position, a tier's every block), so
 *   `summary` is the fields alone and `standard` already has everything.
 *
 * The gating rule itself ({@link ./disclosure.isActiveAtLevel}) is untouched:
 * this writes the tags that rule already reads. A lookup that declares its own
 * disclosure is returned as it is — its author decided.
 *
 * One consequence is accepted rather than avoided: a user whose config sets
 * `detail` now sees these lookups follow it, as every declared one always did.
 */
function withDisclosure(lookup: PackLookup): PackLookup {
  if (lookup.disclosure) return lookup;
  return {
    ...lookup,
    disclosure: { levels: [...DETAIL_LEVELS], default: IMPUTED_DEFAULT_LEVEL },
    ...(lookup.expand
      ? {
          expand: lookup.expand.map((expand) => ({
            ...expand,
            level: expand.level ?? IMPUTED_EXPAND_LEVEL,
          })),
        }
      : {}),
  };
}

/** The level an imputed disclosure answers at when none is asked for: all of it. */
const IMPUTED_DEFAULT_LEVEL = "detailed";

/** The level from which an imputed disclosure shows an untagged expand. */
const IMPUTED_EXPAND_LEVEL = "standard";

/** Normalize a pack disclosure into a {@link DisclosureSpec} (default → base). */
function disclosureSpec(disclosure: PackLookup["disclosure"]): DisclosureSpec {
  const levels = disclosure?.levels ?? [];
  return {
    levels: [...levels],
    default: disclosure?.default ?? levels[0] ?? "summary",
  };
}

/**
 * The page parameters EVERY list-shaped verb carries — `list` and every extra
 * verb alike.
 *
 * Not declared per story, and not declarable: a page is a property of a
 * list-shaped read, so a story that forgot to declare one would be the one
 * answer an agent could not bound. The default is named in the help text
 * because a cap a caller cannot see is exactly the hidden behaviour
 * CONSTITUTION §VI rules out — the number a caller gets when they pass nothing
 * has to be readable in `--help`.
 */
const PAGE_PARAMS: readonly ParamSpec[] = [
  {
    kind: "number",
    name: "limit",
    doc: `Maximum rows to return, 1 to ${MAX_LIST_WINDOW} (default ${DEFAULT_LIST_LIMIT}).`,
  },
  {
    kind: "string",
    name: "after",
    doc: "Continue from a previous page: the cursor that page reported.",
  },
];

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
        repeatable: true,
      } satisfies ParamSpec;
    }
    return {
      kind: "string",
      name: filter.param,
      doc,
      repeatable: true,
    } satisfies ParamSpec;
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
