import type { Store } from "@canonical/ke";
import { PragmaError } from "#error";
import type {
  ColumnDef,
  LookupField,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
} from "../../contracts.js";
import type { Formatters } from "../../formatters.js";
import lookupMany from "../../lookupMany.js";
import {
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "../../renderers.js";
import { suggestNames } from "../../suggestions/index.js";
import requirePragmaContext from "../requirePragmaContext.js";
import type { LookupStory, ReadStory, StoryParam } from "../types.js";
import applyPackFilters from "./applyPackFilters.js";
import applyPackSearch from "./applyPackSearch.js";
import buildLookupQuery, {
  buildExpandQuery,
  buildLookupNamesQuery,
} from "./buildLookupQuery.js";
import runSelectQuery from "./runSelectQuery.js";
import type {
  StoryPackDefinition,
  StoryPackDisclosure,
  StoryPackFilter,
  StoryPackLookup,
  StoryPackSearch,
} from "./types.js";

/** A pack entity/row: SELECT variable name → string value. */
type PackRow = Record<string, string>;

/**
 * A looked-up pack entity: flat SELECT fields plus any expanded child arrays
 * (pack v1 nested projections). Scalar fields are strings; an expand's value
 * is the array of its child rows.
 */
type PackEntity = Record<string, string | readonly PackRow[]>;

/** The read stories a pack definition compiles to. */
export interface CompiledPackStories {
  readonly list: ReadStory<PackRow[], PackRow[]>;
  readonly lookup?: LookupStory<PackEntity, PackEntity>;
}

/**
 * Compile one validated story-pack definition into kernel read stories.
 *
 * The list story runs the pack's preferred SELECT verbatim; the lookup
 * story runs the generated, injection-safe per-name query. Both render
 * through the shared generic renderers with the runtime's merged prefix
 * map, so foreign namespaces display compacted.
 *
 * @param definition - A validated pack definition.
 * @param source - Where the definition came from, for diagnostics.
 * @param prefixes - The merged prefix map used for display.
 * @returns The compiled list story and, when declared, the lookup story.
 */
export default function compilePackStories(
  definition: StoryPackDefinition,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): CompiledPackStories {
  const { noun } = definition;
  const heading = capitalize(noun);
  const description = definition.description ?? `List ${noun} entries`;

  const listColumns: ColumnDef<PackRow>[] = definition.list.columns.map(
    (column) => ({
      key: column.field,
      label: column.label ?? column.field,
    }),
  );
  const listOptions: RenderListOptions<PackRow> = {
    heading,
    columns: listColumns,
    prefixes,
  };
  const listFormatters: Formatters<PackRow[]> = {
    plain: (rows) => renderListPlain(rows, listOptions),
    llm: (rows) => renderListLlm(rows, listOptions),
    json: (rows) => JSON.stringify(rows, null, 2),
  };

  const filters = definition.list.filters;
  const search = definition.list.search;
  // The generated example uses the first filter with a declared value set —
  // a value-free filter has no representative value to show.
  const filterExample = filters?.find((filter) => filter.values !== undefined);
  const list: ReadStory<PackRow[], PackRow[]> = {
    noun,
    verb: "list",
    description,
    toolDescription:
      definition.toolDescription ?? `${description} (story pack: ${source}).`,
    params: [...projectFilterParams(filters), ...projectSearchParam(search)],
    examples: [
      `pragma ${noun} list`,
      ...(filterExample
        ? [
            `pragma ${noun} list --${filterExample.param} ${quoteExampleValue(filterExample.values?.at(0) ?? "")}`,
          ]
        : []),
      `pragma ${noun} list --llm`,
    ],
    resolve: async (rt, params) =>
      applyPackSearch(
        applyPackFilters(
          await runSelectQuery(rt.store, definition.list.query, source),
          filters,
          params,
        ),
        search,
        params,
      ),
    toOutput: (rows) => rows,
    formatters: listFormatters,
    toEnvelope: (rows) => ({ data: rows, meta: { count: rows.length } }),
  };

  const lookup = definition.lookup
    ? compileLookup(definition.lookup, noun, source, prefixes)
    : undefined;

  return { list, ...(lookup ? { lookup } : {}) };
}

function compileLookup(
  lookup: StoryPackLookup,
  noun: string,
  source: string,
  prefixes: Readonly<Record<string, string>>,
): LookupStory<PackEntity, PackEntity> {
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
  // parameter (enum of the levels) on both surfaces.
  const disclosure = lookup.disclosure;
  const detailParams: StoryParam[] = disclosure
    ? [
        {
          name: "detail",
          type: "string",
          description: `Disclosure level (${disclosure.levels.join(", ")})`,
          enum: [...disclosure.levels],
        },
      ]
    : [];

  return {
    noun,
    description: `Look up ${noun} details by name`,
    toolDescription: `Get details for one or more ${noun} entries by name (story pack: ${source}).`,
    namesDescription: `${capitalize(noun)} names`,
    params: detailParams,
    complete: async (partial, cmdCtx) => {
      const ctx = requirePragmaContext(cmdCtx);
      const names = await listEntityNames(ctx.store, lookup, source);
      return names.filter((name) =>
        name.toLowerCase().startsWith(partial.toLowerCase()),
      );
    },
    examples: [`pragma ${noun} lookup <name>`],
    resolve: (rt, names, params) => {
      const level = disclosure
        ? resolveDetailLevel(params, rt.config ?? {}, disclosure)
        : undefined;
      return lookupMany(names, (query) =>
        lookupPackEntity(rt.store, lookup, noun, query, source, level),
      );
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
}

/**
 * Look up one pack entity by name via the generated query.
 *
 * @throws PragmaError with code `ENTITY_NOT_FOUND` and ranked suggestions
 *   when no entity matches.
 * @note Impure — queries the ke store.
 */
async function lookupPackEntity(
  store: Store,
  lookup: StoryPackLookup,
  noun: string,
  query: string,
  source: string,
  level?: string,
): Promise<PackEntity> {
  const rows = await runSelectQuery(
    store,
    buildLookupQuery(lookup, query),
    source,
  );
  const base = rows.at(0);
  if (!base) {
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

  // Enrich with any declared multi-valued expands (pack v1 nested projections).
  // Each expand runs a sub-SELECT bound to the resolved entity IRI (`base.uri`),
  // which is store-derived, never user input. An expand tagged with a
  // disclosure level is fetched only at/above that level — so a lower level
  // never runs the sub-SELECT and the renderer omits the (absent) section.
  const entity: PackEntity = { ...base };
  const entityUri = base.uri;
  if (entityUri) {
    const levels = lookup.disclosure?.levels ?? [];
    const activeIdx = level ? levels.indexOf(level) : Number.POSITIVE_INFINITY;
    for (const expand of lookup.expand ?? []) {
      const requiredIdx = expand.level ? levels.indexOf(expand.level) : 0;
      if (activeIdx < requiredIdx) continue;
      entity[expand.name] = await runSelectQuery(
        store,
        buildExpandQuery(expand, entityUri),
        source,
      );
    }
  }
  return entity;
}

/**
 * Resolve the effective disclosure level for a lookup call.
 *
 * Precedence (highest → lowest): an explicit `--detail`/`detail` value,
 * the global `config.detail` default, the pack's declared `disclosure.default`,
 * then the base level (the first declared). A config/pack value that is not one
 * of the pack's levels is ignored (a global default may target another pack).
 */
function resolveDetailLevel(
  params: Record<string, unknown>,
  config: { readonly detail?: string },
  disclosure: StoryPackDisclosure,
): string {
  const { levels } = disclosure;
  const explicit =
    typeof params.detail === "string" ? params.detail : undefined;
  for (const candidate of [explicit, config.detail, disclosure.default]) {
    if (candidate !== undefined && levels.includes(candidate)) {
      return candidate;
    }
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
  value: string | readonly PackRow[] | undefined,
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
