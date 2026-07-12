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
import buildLookupQuery, { buildLookupNamesQuery } from "./buildLookupQuery.js";
import runSelectQuery from "./runSelectQuery.js";
import type {
  StoryPackDefinition,
  StoryPackFilter,
  StoryPackLookup,
} from "./types.js";

/** A pack entity/row: SELECT variable name → string value. */
type PackRow = Record<string, string>;

/** The read stories a pack definition compiles to. */
export interface CompiledPackStories {
  readonly list: ReadStory<PackRow[], PackRow[]>;
  readonly lookup?: LookupStory<PackRow, PackRow>;
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
  const filterExample = filters?.at(0);
  const list: ReadStory<PackRow[], PackRow[]> = {
    noun,
    verb: "list",
    description,
    toolDescription:
      definition.toolDescription ?? `${description} (story pack: ${source}).`,
    params: projectFilterParams(filters),
    examples: [
      `pragma ${noun} list`,
      ...(filterExample
        ? [
            `pragma ${noun} list --${filterExample.param} ${quoteExampleValue(filterExample.values.at(0) ?? "")}`,
          ]
        : []),
      `pragma ${noun} list --llm`,
    ],
    resolve: async (rt, params) =>
      applyPackFilters(
        await runSelectQuery(rt.store, definition.list.query, source),
        filters,
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
): LookupStory<PackRow, PackRow> {
  const fields: LookupField<PackRow>[] = (lookup.fields ?? []).map((field) => ({
    label: field.label ?? field.name,
    value: (entity) => entity[field.name],
  }));
  const sections: SectionDef<PackRow>[] = (lookup.sections ?? []).map(
    (section) => ({
      key: section.name,
      heading: section.label ?? section.name,
      kind: section.kind ?? "field",
    }),
  );
  const lookupOptions: RenderLookupOptions<PackRow> = {
    title: (entity) => entity.name ?? entity.uri ?? "(unnamed)",
    fields,
    sections,
    prefixes,
  };
  const lookupFormatters: Formatters<PackRow> = {
    plain: (entity) => renderLookupPlain(entity, lookupOptions),
    llm: (entity) => renderLookupLlm(entity, lookupOptions),
    json: (entity) => JSON.stringify(entity, null, 2),
  };

  return {
    noun,
    description: `Look up ${noun} details by name`,
    toolDescription: `Get details for one or more ${noun} entries by name (story pack: ${source}).`,
    namesDescription: `${capitalize(noun)} names`,
    complete: async (partial, cmdCtx) => {
      const ctx = requirePragmaContext(cmdCtx);
      const names = await listEntityNames(ctx.store, lookup, source);
      return names.filter((name) =>
        name.toLowerCase().startsWith(partial.toLowerCase()),
      );
    },
    examples: [`pragma ${noun} lookup <name>`],
    resolve: (rt, names) =>
      lookupMany(names, (query) =>
        lookupPackEntity(rt.store, lookup, noun, query, source),
      ),
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
): Promise<PackRow> {
  const rows = await runSelectQuery(
    store,
    buildLookupQuery(lookup, query),
    source,
  );
  const entity = rows.at(0);
  if (entity) {
    return entity;
  }

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
 * The declared value set becomes the parameter's enum, which the kernel
 * projects to CLI select choices and an MCP enum schema.
 */
function projectFilterParams(
  filters: readonly StoryPackFilter[] | undefined,
): StoryParam[] {
  return (filters ?? []).map((filter) => ({
    name: filter.param,
    type: "string",
    description:
      filter.description ??
      `Filter by ${filter.variable} (${filter.values.join(", ")})`,
    enum: filter.values,
  }));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
