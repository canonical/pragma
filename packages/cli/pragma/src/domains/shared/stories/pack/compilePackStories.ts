import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import resolveUri from "../../../graph/helpers/resolveUri.js";
import type {
  ColumnDef,
  LookupField,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
} from "../../contracts.js";
import type { Formatters } from "../../formatters.js";
import lookupMany from "../../lookupMany.js";
import parseSampleCount, {
  DEFAULT_SAMPLE_COUNT,
  MAX_SAMPLE_COUNT,
  MIN_SAMPLE_COUNT,
} from "../../parseSampleCount.js";
import pickRandom from "../../pickRandom.js";
import {
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "../../renderers.js";
import createSampleFormatters from "../../sampleFormatters.js";
import {
  expandGlob,
  isGlobPattern,
  suggestNames,
} from "../../suggestions/index.js";
import type { PragmaRuntime, SampleOutput } from "../../types/index.js";
import requirePragmaContext from "../requirePragmaContext.js";
import type { LookupStory, ReadStory, StoryParam } from "../types.js";
import applyPackFilters from "./applyPackFilters.js";
import applyPackSearch from "./applyPackSearch.js";
import buildLookupQuery, {
  activeLookupExpands,
  buildExpandQuery,
  buildLookupByIriQuery,
  buildLookupNamesQuery,
  buildNameResolveQuery,
} from "./buildLookupQuery.js";
import fetchGraphqlLookupEntity from "./fetchGraphqlLookup.js";
import runSelectQuery from "./runSelectQuery.js";
import type {
  PackChildRow,
  PackEntity,
  PackRow,
  StoryPackDefinition,
  StoryPackDisclosure,
  StoryPackFilter,
  StoryPackList,
  StoryPackLookup,
  StoryPackSearch,
} from "./types.js";
import { isEmbeddableIri } from "./validateStoryPackDefinition.js";

/** Resolved sample data: the drawn entities plus the population size. */
interface PackSampleData {
  readonly samples: PackEntity[];
  readonly totalCount: number;
}

/** The read stories a pack definition compiles to. */
export interface CompiledPackStories {
  /** The list story, when the pack declares one. */
  readonly list?: ReadStory<PackRow[], PackRow[]>;
  /** Extra list-shaped verbs (e.g. `categories`), in declaration order. */
  readonly verbs: readonly ReadStory<PackRow[], PackRow[]>[];
  readonly lookup?: LookupStory<PackEntity, PackEntity>;
  /** The `sample` story, when the lookup declares the capability. */
  readonly sample?: ReadStory<PackSampleData, SampleOutput<PackEntity>>;
}

/**
 * Compile one validated story-pack definition into kernel read stories.
 *
 * The list story (and any extra list-shaped verbs) run the pack's
 * preferred SELECT verbatim; the lookup and sample stories run generated,
 * injection-safe queries. All render through the shared generic renderers
 * with the runtime's merged prefix map, so foreign namespaces display
 * compacted.
 *
 * @param definition - A validated pack definition.
 * @param source - Where the definition came from, for diagnostics.
 * @param prefixes - The merged prefix map used for display.
 * @returns The compiled list story, extra verbs, and — when declared —
 *   the lookup and sample stories.
 */
export default function compilePackStories(
  definition: StoryPackDefinition,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): CompiledPackStories {
  const { noun } = definition;
  const description = definition.description ?? `List ${noun} entries`;

  const list = definition.list
    ? compileListVerb(definition.list, {
        noun,
        verb: "list",
        heading: capitalize(noun),
        description,
        toolDescription:
          definition.toolDescription ??
          `${description} (story pack: ${source}).`,
        source,
        prefixes,
      })
    : undefined;

  const verbs = (definition.verbs ?? []).map((verb) => {
    const verbDescription = verb.description ?? `List ${noun} ${verb.verb}`;
    return compileListVerb(verb, {
      noun,
      verb: verb.verb,
      heading: `${capitalize(noun)} ${verb.verb}`,
      description: verbDescription,
      toolDescription:
        verb.toolDescription ?? `${verbDescription} (story pack: ${source}).`,
      source,
      prefixes,
    });
  });

  const compiled = definition.lookup
    ? compileLookup(definition.lookup, noun, source, prefixes)
    : undefined;

  return {
    ...(list ? { list } : {}),
    verbs,
    ...(compiled ? { lookup: compiled.lookup } : {}),
    ...(compiled?.sample ? { sample: compiled.sample } : {}),
  };
}

/** Presentation facts for one compiled list-shaped verb. */
interface ListVerbMeta {
  readonly noun: string;
  readonly verb: string;
  readonly heading: string;
  readonly description: string;
  readonly toolDescription: string;
  readonly source: string;
  readonly prefixes: Readonly<Record<string, string>>;
}

/**
 * Compile one list-shaped story half (the `list` verb or an extra verb)
 * into a kernel read story.
 */
function compileListVerb(
  shape: StoryPackList,
  meta: ListVerbMeta,
): ReadStory<PackRow[], PackRow[]> {
  const { noun, verb, source, prefixes } = meta;
  const listColumns: ColumnDef<PackRow>[] = shape.columns.map((column) => ({
    key: column.field,
    label: column.label ?? column.field,
  }));
  const listOptions: RenderListOptions<PackRow> = {
    heading: meta.heading,
    columns: listColumns,
    prefixes,
  };
  const listFormatters: Formatters<PackRow[]> = {
    plain: (rows) => renderListPlain(rows, listOptions),
    llm: (rows) => renderListLlm(rows, listOptions),
    json: (rows) => JSON.stringify(rows, null, 2),
  };

  const filters = shape.filters;
  const search = shape.search;
  // The generated example uses the first filter with a declared value set —
  // a value-free filter has no representative value to show.
  const filterExample = filters?.find((filter) => filter.values !== undefined);
  return {
    noun,
    verb,
    description: meta.description,
    toolDescription: meta.toolDescription,
    params: [...projectFilterParams(filters), ...projectSearchParam(search)],
    examples: [
      `pragma ${noun} ${verb}`,
      ...(filterExample
        ? [
            `pragma ${noun} ${verb} --${filterExample.param} ${quoteExampleValue(filterExample.values?.at(0) ?? "")}`,
          ]
        : []),
      `pragma ${noun} ${verb} --llm`,
    ],
    resolve: async (rt, params) => {
      const rows = applyPackSearch(
        applyPackFilters(
          await runSelectQuery(rt.store, shape.query, source),
          filters,
          params,
        ),
        search,
        params,
      );
      // Empty-result guard, thrown from resolve so both surfaces (CLI
      // command and MCP tool) fail typed instead of rendering nothing.
      // Filtered-to-empty ALWAYS throws (the filter is the likely cause
      // and the recovery is mechanical); a genuinely-empty unfiltered
      // store only throws when the pack authored an emptyRecovery hint.
      if (rows.length === 0) {
        const error = buildListEmptyError(
          noun,
          filters,
          params,
          shape.emptyRecovery,
        );
        if (error) throw error;
      }
      return rows;
    },
    toOutput: (rows) => rows,
    formatters: listFormatters,
    toEnvelope: (rows) => ({ data: rows, meta: { count: rows.length } }),
  };
}

function compileLookup(
  lookup: StoryPackLookup,
  noun: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): {
  lookup: LookupStory<PackEntity, PackEntity>;
  sample?: ReadStory<PackSampleData, SampleOutput<PackEntity>>;
} {
  const fields: LookupField<PackEntity>[] = (lookup.fields ?? []).map(
    (field) => ({
      label: field.label ?? field.name,
      value: (entity) => entity[field.name],
    }),
  );
  const flatSections: SectionDef<PackEntity>[] = (lookup.sections ?? []).map(
    (section) => ({
      key: section.name,
      heading: section.label ?? section.name,
      kind: section.kind ?? "field",
    }),
  );
  // Expands render after the flat sections, as list/table collections.
  const expandSections: SectionDef<PackEntity>[] = (lookup.expand ?? []).map(
    (expand) => ({
      key: expand.name,
      heading: expand.heading ?? expand.name,
      kind: expand.kind ?? "list",
      ...(expand.showWhenEmpty ? { showWhenEmpty: true } : {}),
    }),
  );
  const sections = [...flatSections, ...expandSections];
  const lookupOptions: RenderLookupOptions<PackEntity> = {
    title: (entity) => scalar(entity.name) ?? scalar(entity.uri) ?? "(unnamed)",
    fields,
    sections,
    prefixes,
  };
  const lookupFormatters: Formatters<PackEntity> = {
    plain: (entity) => renderLookupPlain(entity, lookupOptions),
    llm: (entity) => renderLookupLlm(entity, lookupOptions),
    json: (entity) => JSON.stringify(entity, null, 2),
  };

  // Disclosure capability: a declared level set derives a `--detail <level>`
  // parameter (enum of the levels) on both surfaces, plus one legacy alias
  // boolean per non-base level (`--digest`, `--detailed`) that implies its
  // level — preserving the pre-pack flag ergonomics on both surfaces.
  const disclosure = lookup.disclosure;
  const detailParams: StoryParam[] = disclosure
    ? [
        {
          name: "detail",
          type: "string",
          description: `Disclosure level (${disclosure.levels.join(", ")})`,
          enum: [...disclosure.levels],
        },
        ...disclosure.levels.slice(1).map(
          (level): StoryParam => ({
            name: level,
            type: "boolean",
            description: `Shorthand for --detail ${level}`,
            toolDescription: `Shorthand for detail="${level}"`,
            default: false,
          }),
        ),
      ]
    : [];

  const lookupStory: LookupStory<PackEntity, PackEntity> = {
    noun,
    description:
      lookup.description ?? `Look up ${noun} details by name, IRI, or glob`,
    toolDescription:
      lookup.toolDescription ??
      `Get details for one or more ${noun} entries by name, prefixed name (ex:thing), absolute IRI, or glob pattern (story pack: ${source}).`,
    namesDescription: `${capitalize(noun)} names, IRIs/prefixed names, or glob patterns`,
    params: detailParams,
    complete: async (partial, cmdCtx) => {
      const ctx = requirePragmaContext(cmdCtx);
      const names = await listEntityNames(ctx.store, lookup, source);
      return names.filter((name) =>
        name.toLowerCase().startsWith(partial.toLowerCase()),
      );
    },
    examples: [`pragma ${noun} lookup <name>`],
    resolve: async (rt, names, params, view) => {
      const level = disclosure
        ? resolveDetailLevel(
            params,
            rt.config ?? {},
            disclosure,
            view?.surface ?? "cli",
          )
        : undefined;
      // Glob queries (`react/*`) expand against the entity name list before
      // resolution; a glob matching nothing becomes its own error entry.
      const expanded = await expandPackLookupQueries(
        rt.store,
        lookup,
        noun,
        source,
        names,
      );
      const result = await lookupMany(expanded.names, (query) =>
        lookupPackEntity(rt, lookup, noun, query, source, prefixes, level),
      );
      return {
        ...result,
        errors: [...result.errors, ...expanded.globErrors],
      };
    },
    toFmtInput: (entity) => entity,
    formatters: lookupFormatters,
    emptyNamesError: () =>
      PragmaError.invalidInput("names", "(empty)", {
        recovery: {
          message: `List available ${noun} entries.`,
          cli: `pragma ${noun} list`,
          mcp: { tool: `${noun}_list` },
        },
      }),
  };

  const sample = lookup.sample
    ? compileSample(lookup, noun, source, prefixes, lookupFormatters)
    : undefined;

  return { lookup: lookupStory, ...(sample ? { sample } : {}) };
}

/**
 * Build the typed empty-list error for a pack list, or `undefined` when
 * the emptiness should render as a plain empty list.
 *
 * With a VALUE-CONSTRAINED filter active the emptiness is (likely) the
 * filter's doing, so the recovery is to re-list unfiltered — this branch
 * fires for every pack list (the P3 generalization of P2's opt-in guard);
 * the CLI error render and the MCP error envelope carry the same `filters`
 * echo and `recovery` by construction. A value-constrained filter admits
 * only validated values, so a valid value matching nothing means the store
 * lacks that data — a mechanical recovery. VALUE-FREE filters (data-driven,
 * no declared set) stay lenient: an unmatched free string is a legitimate
 * empty (a typo or an empty data-driven category), so it renders `data: []`
 * — preserving the value-free-filter and standard-parity contracts. With no
 * value-constrained filter active the store simply has no such data: the
 * pack's declared recovery (an install hint) applies when authored,
 * otherwise `data: []` + `meta.count: 0` stand.
 */
function buildListEmptyError(
  noun: string,
  filters: readonly StoryPackFilter[] | undefined,
  params: Record<string, unknown>,
  emptyRecovery: StoryPackList["emptyRecovery"],
): PragmaError | undefined {
  // Only value-constrained filters (a declared `values` set) trigger the
  // mechanical re-list recovery; value-free filters render empty leniently.
  const applied = (filters ?? []).filter(
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
  if (emptyRecovery) {
    return PragmaError.emptyResults(noun, { recovery: emptyRecovery });
  }
  return undefined;
}

/**
 * Compile the `sample` story for a lookup that declares the capability.
 *
 * Draws N random entity names (clamped 1–5) and resolves each through the
 * SAME lookup path at the HIGHEST disclosure level, so exemplars carry the
 * full shape — fields, expands, and all. Rendering reuses the lookup
 * formatters per entity under the shared sample header.
 */
function compileSample(
  lookup: StoryPackLookup,
  noun: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
  lookupFormatters: Formatters<PackEntity>,
): ReadStory<PackSampleData, SampleOutput<PackEntity>> {
  const config =
    lookup.sample === true || lookup.sample === undefined ? {} : lookup.sample;
  const description =
    config.description ??
    `Return randomly selected complete ${noun} entries as exemplars for shape discovery`;
  const toolDescription =
    config.toolDescription ??
    `Return ${MIN_SAMPLE_COUNT}–${MAX_SAMPLE_COUNT} randomly selected complete ${noun} entries as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.`;
  const sampleFormatters = createSampleFormatters<PackEntity>(
    `${noun} entries`,
    (entity, mode) => lookupFormatters[mode](entity),
  );
  const toOutput = (data: PackSampleData): SampleOutput<PackEntity> => ({
    ...data,
    nextSteps: sampleNextSteps(noun, data),
  });

  return {
    noun,
    verb: "sample",
    description,
    toolDescription,
    params: [
      {
        name: "count",
        type: "string",
        description: `Number of samples to return (${MIN_SAMPLE_COUNT}–${MAX_SAMPLE_COUNT}, default ${config.count ?? DEFAULT_SAMPLE_COUNT})`,
        positional: true,
      },
    ],
    examples: [`pragma ${noun} sample`, `pragma ${noun} sample 3`],
    resolve: async (rt, params) => {
      const count = parseSampleCount(params.count ?? config.count);
      const names = await listEntityNames(rt.store, lookup, source);
      // Exemplars resolve at the HIGHEST disclosure level so every expand
      // is fetched — samples exist to show the full data shape.
      const level = lookup.disclosure?.levels.at(-1);
      const selected = pickRandom(names, count);
      const samples = await Promise.all(
        selected.map((name) =>
          lookupPackEntity(rt, lookup, noun, name, source, prefixes, level),
        ),
      );
      return { samples, totalCount: names.length };
    },
    toOutput,
    formatters: sampleFormatters,
    toEnvelope: (data) => ({
      data: toOutput(data),
      meta: { count: data.samples.length },
    }),
  };
}

/** Agent-facing follow-ups appended to sample output. */
function sampleNextSteps(noun: string, data: PackSampleData): string[] {
  return [
    `These are ${data.samples.length} of ${data.totalCount} total ${noun} entries.`,
    `Use ${noun}_lookup to inspect specific entries by name.`,
    `Use ${noun}_list to browse all entries.`,
  ];
}

/**
 * Partition lookup queries into concrete names and expanded globs.
 *
 * Literal names pass through unchanged. Glob patterns expand against the
 * pack's entity name list; a glob matching nothing produces an
 * `EMPTY_RESULTS` error entry (mirroring the shared lookup-glob contract)
 * instead of failing the whole batch.
 *
 * @note Impure — fetches the entity name list when a glob is present.
 */
async function expandPackLookupQueries(
  store: Store,
  lookup: StoryPackLookup,
  noun: string,
  source: string,
  queries: readonly string[],
): Promise<{
  names: string[];
  globErrors: { query: string; code: string; message: string }[];
}> {
  if (!queries.some(isGlobPattern)) {
    return { names: [...queries], globErrors: [] };
  }

  const allNames = await listEntityNames(store, lookup, source);
  const names: string[] = [];
  const globErrors: { query: string; code: string; message: string }[] = [];
  for (const query of queries) {
    if (!isGlobPattern(query)) {
      names.push(query);
      continue;
    }
    const expanded = expandGlob(query, allNames);
    if (expanded.length === 0) {
      globErrors.push({
        query,
        code: "EMPTY_RESULTS",
        message: `No ${noun} entries matching "${query}".`,
      });
    } else {
      names.push(...expanded);
    }
  }
  return { names, globErrors };
}

/**
 * Look up one pack entity by name, prefixed name, or absolute IRI, via the
 * fetch strategy the pack declares.
 *
 * A query shaped like an IRI (`https://…` or `prefix:local`) is resolved
 * through the runtime prefix map and addressed exactly via a generated
 * `BIND(<iri> AS ?uri)` query; anything else matches the `by` property's
 * value case-insensitively. Both query forms are generated — the resolved
 * IRI is validated against the embeddable-IRI shape and names are escaped
 * as SPARQL string literals, so user input never reaches query text raw.
 *
 * Once the entity is resolved, its values are fetched per the declared
 * source (both share the injection-safe SPARQL name resolution above):
 *
 * - `"sparql"` (default): one generated SELECT for the flat values plus one
 *   sub-SELECT per active expand, each bound to the resolved IRI.
 * - `"graphql"`: ONE generated document covering all active fields and
 *   expands, executed in-process against the runtime's compiled schema and
 *   unwrapped to the identical entity shape.
 *
 * @throws PragmaError with code `ENTITY_NOT_FOUND` and ranked suggestions
 *   when no entity matches, or `INVALID_INPUT` when an IRI-shaped query
 *   uses an unknown prefix or malformed IRI.
 * @note Impure — queries the ke store (and compiles the GraphQL schema on
 *   the first graphql-sourced lookup).
 */
async function lookupPackEntity(
  rt: Pick<PragmaRuntime, "store" | "graphql">,
  lookup: StoryPackLookup,
  noun: string,
  query: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
  level?: string,
): Promise<PackEntity> {
  const { store } = rt;
  const graphqlSourced = lookup.source === "graphql";
  const rows = await runSelectQuery(
    store,
    graphqlSourced
      ? buildNameResolveQuery(lookup, query)
      : buildEntityQuery(lookup, query, prefixes, level),
    source,
  );
  const base = rows.at(0);
  if (!base?.uri) {
    const candidates = await listEntityNames(store, lookup, source);
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
    return fetchGraphqlLookupEntity(
      rt,
      lookup,
      base.uri,
      base.name ?? query,
      source,
      prefixes,
      level,
    );
  }

  // Enrich with any declared multi-valued expands (pack v1 nested projections).
  // Each expand runs a sub-SELECT bound to the resolved entity IRI (`base.uri`),
  // which is store-derived, never user input. An expand tagged with a
  // disclosure level is fetched only at/above that level — so a lower level
  // never runs the sub-SELECT and the renderer omits the (absent) section.
  const entity: PackEntity = { ...base };
  for (const expand of activeLookupExpands(lookup, level)) {
    entity[expand.name] = await runSelectQuery(
      store,
      buildExpandQuery(expand, base.uri),
      source,
    );
  }
  return entity;
}

/**
 * Build the base entity SELECT for a lookup query.
 *
 * Detection mirrors the retired built-in standard lookup: a query starting
 * with `http(s)://` or containing `:` is treated as an IRI or prefixed
 * name and resolved through the merged prefix map. The resolved IRI must
 * still match the embeddable shape the pack validator holds authored
 * terms to; anything else is rejected before it can reach query text.
 *
 * @throws PragmaError with code `INVALID_INPUT` when the query is
 *   IRI-shaped but uses an unknown prefix or resolves to a non-embeddable
 *   IRI.
 */
function buildEntityQuery(
  lookup: StoryPackLookup,
  query: string,
  prefixes: Readonly<Record<string, string>>,
  level?: string,
): string {
  if (!looksLikeIri(query)) {
    return buildLookupQuery(lookup, query, level);
  }
  // resolveUri validates prefix membership and rejects IRI-breaking
  // characters; the embeddable-shape check adds the validator's stricter
  // `scheme://` contract before the IRI is embedded as `<iri>`.
  const resolved = resolveUri(query, prefixes);
  if (!isEmbeddableIri(resolved)) {
    throw PragmaError.invalidInput("name", query, {
      recovery: {
        message:
          "Use an absolute IRI (https://…), a prefixed name (ex:thing), or a plain entity name.",
      },
    });
  }
  return buildLookupByIriQuery(lookup, resolved);
}

/** Whether a lookup query addresses an entity by IRI or prefixed name. */
function looksLikeIri(query: string): boolean {
  return (
    query.startsWith("http://") ||
    query.startsWith("https://") ||
    query.includes(":")
  );
}

/**
 * Resolve the effective disclosure level for a lookup call.
 *
 * Precedence (highest → lowest): an explicit `--detail`/`detail` value, a
 * legacy alias flag set to true (the HIGHEST requested level wins when
 * several are set), the global `config.detail` default, the MCP full-data
 * default, the pack's declared `disclosure.default`, then the base level
 * (the first declared). A config/pack value that is not one of the pack's
 * levels is ignored (a global default may target another pack).
 *
 * `config.detail` deliberately outranks the MCP default: the config value
 * is something the user explicitly chose, while the MCP default is only a
 * surface fallback — a user who configured `detail: summary` gets summary
 * on both surfaces.
 *
 * The MCP default follows the ratified surface contract (see
 * `resolveLookupDetailed`): the CLI opts in while MCP opts out, so an MCP
 * call with no explicit or configured choice resolves to the highest
 * level — agents want full data by default — and an alias explicitly set
 * to false (e.g. `detailed: false`) opts down to the pack default or base
 * level.
 */
function resolveDetailLevel(
  params: Record<string, unknown>,
  config: { readonly detail?: string },
  disclosure: StoryPackDisclosure,
  surface: "cli" | "mcp",
): string {
  const { levels } = disclosure;
  const explicit =
    typeof params.detail === "string" ? params.detail : undefined;
  if (explicit !== undefined && levels.includes(explicit)) {
    return explicit;
  }

  const aliased = levels
    .filter((level, index) => index > 0 && params[level] === true)
    .at(-1);
  if (aliased !== undefined) {
    return aliased;
  }

  if (config.detail !== undefined && levels.includes(config.detail)) {
    return config.detail;
  }

  if (surface === "mcp") {
    const optedDown = levels.some(
      (level, index) => index > 0 && params[level] === false,
    );
    const highest = levels.at(-1);
    if (!optedDown && highest !== undefined) {
      return highest;
    }
  }

  const packDefault = disclosure.default;
  if (packDefault !== undefined && levels.includes(packDefault)) {
    return packDefault;
  }
  return levels[0] ?? "";
}

async function listEntityNames(
  store: Store,
  lookup: StoryPackLookup,
  source: string,
): Promise<string[]> {
  const rows = await runSelectQuery(
    store,
    buildLookupNamesQuery(lookup),
    source,
  );
  return rows.map((row) => row.name ?? "").filter((name) => name !== "");
}

/** Return a value only when it is a scalar string (expands hold arrays). */
function scalar(
  value: string | readonly PackChildRow[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Quote a filter value for a shell help example when it is not a bare word.
 *
 * Values with whitespace or shell-sensitive characters are double-quoted
 * so the generated `pragma … list --flag value` example stays valid to
 * copy-paste; simple tokens render unquoted.
 */
function quoteExampleValue(value: string): string {
  return /^[\w.-]+$/.test(value) ? value : JSON.stringify(value);
}

/**
 * Project declared pack filters onto kernel story parameters.
 *
 * A declared value set becomes the parameter's enum, which the kernel
 * projects to CLI select choices and an MCP enum schema. A value-free
 * filter projects as a plain string parameter — its valid values are
 * data-driven and enforced only as a post-query row predicate.
 */
function projectFilterParams(
  filters: readonly StoryPackFilter[] | undefined,
): StoryParam[] {
  return (filters ?? []).map((filter) => ({
    name: filter.param,
    type: "string",
    description:
      filter.description ??
      (filter.values
        ? `Filter by ${filter.variable} (${filter.values.join(", ")})`
        : `Filter by ${filter.variable}`),
    ...(filter.values ? { enum: filter.values } : {}),
  }));
}

/**
 * Project a declared free-text search onto the `search` story parameter.
 */
function projectSearchParam(search: StoryPackSearch | undefined): StoryParam[] {
  if (!search) return [];
  return [
    {
      name: "search",
      type: "string",
      description:
        search.description ?? `Search in ${search.variables.join(", ")}`,
    },
  ];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
