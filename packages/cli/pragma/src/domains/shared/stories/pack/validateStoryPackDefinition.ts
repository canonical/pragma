import { PragmaError } from "#error";
import { MAX_SAMPLE_COUNT, MIN_SAMPLE_COUNT } from "../../parseSampleCount.js";
import type {
  StoryPackColumn,
  StoryPackDefinition,
  StoryPackDisclosure,
  StoryPackExpand,
  StoryPackExpandField,
  StoryPackExpandSelect,
  StoryPackField,
  StoryPackFilter,
  StoryPackList,
  StoryPackLookup,
  StoryPackNestedExpand,
  StoryPackSample,
  StoryPackSearch,
  StoryPackSection,
  StoryPackVerb,
} from "./types.js";

const NOUN_PATTERN = /^[a-z][a-z0-9-]*$/;
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A legal GraphQL name — `graphqlField`/`graphqlType` escape hatches. */
const GRAPHQL_NAME_PATTERN = /^[_A-Za-z][_0-9A-Za-z]*$/;

/**
 * Object-prototype key names no pack identifier may take.
 *
 * Pack identifiers become plain-object keys at run time — SELECT
 * variables become row keys, expand names become entity keys, and filter
 * params become parameter keys — so `__proto__`/`constructor`/`prototype`
 * are rejected at boot, before any row or params object could be built
 * with a prototype-polluting key.
 */
const RESERVED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Reject an identifier that names a reserved object-prototype key.
 *
 * Shared guard for every FIELD_PATTERN/FILTER_PARAM_PATTERN-shaped
 * identifier (column fields, field/section/expand/select names, filter
 * params and variables, search variables, disclosure levels).
 *
 * @throws PragmaError with code `CONFIG_ERROR` when the value is reserved.
 */
function rejectReservedObjectKey(
  value: string,
  where: string,
  source: string,
): void {
  if (RESERVED_OBJECT_KEYS.has(value)) {
    throw buildStoryConfigError(
      source,
      `"${where}" must not be the reserved object key "${value}".`,
    );
  }
}

/** A prefixed name (`ex:Recipe`) — prefix + local part, no path slashes. */
const PREFIXED_NAME_PATTERN = /^[A-Za-z][\w-]*:[^/<>"\s]+$/;

/** An absolute IRI that can be safely embedded as `<iri>` in SPARQL. */
const EMBEDDABLE_IRI_PATTERN = /^[A-Za-z][\w+.-]*:\/\/[^<>"\s]+$/;

/**
 * Whether a resolved IRI matches the embeddable shape pack terms are held
 * to (no whitespace or `<>"` characters, `scheme://` form).
 *
 * Shared with the lookup path so an IRI-addressed lookup applies the same
 * strictness to resolved user queries as this validator applies to
 * authored pack terms before either is embedded as `<iri>` in SPARQL.
 */
export function isEmbeddableIri(value: string): boolean {
  return EMBEDDABLE_IRI_PATTERN.test(value);
}

/**
 * A filter parameter name: a single lowercase word.
 *
 * Deliberately stricter than a noun (no hyphens): the name is used
 * verbatim as the CLI flag, the Commander result key, and the MCP
 * parameter key. A hyphenated name would register as `--meal-type` but
 * be read back by Commander under the camelCased `mealType`, so the
 * filter would silently never apply on the CLI while working on MCP.
 * Restricting to one lowercase word keeps all three identical.
 */
const FILTER_PARAM_PATTERN = /^[a-z][a-z0-9]*$/;

/**
 * Parameter names taken by global flags or parameters the kernel appends
 * to every read story — `condensed` is added to every MCP list tool,
 * `detailed` to every lookup, `search` is the compiled free-text search
 * parameter, and `detail` the disclosure level selector — so a filter may
 * not reuse them.
 */
const RESERVED_FILTER_PARAMS = new Set([
  "llm",
  "format",
  "verbose",
  "detail",
  "detailed",
  "condensed",
  "names",
  "search",
  "help",
]);

/**
 * Names a disclosure level may not take. Levels derive parameters — the
 * `--detail <level>` selector plus one boolean alias flag per non-base
 * level — so a level must not collide with `detail` itself, the lookup's
 * `names` positional, or kernel/global parameter names. `detailed` is
 * deliberately absent: it is the expected name for a pack's legacy
 * detailed level and derives the compatible `--detailed`/`detailed`
 * alias.
 */
const RESERVED_LEVEL_NAMES = new Set([
  "detail",
  "names",
  "condensed",
  "search",
  "llm",
  "format",
  "verbose",
  "help",
]);

/**
 * Validate one raw story-pack definition.
 *
 * Fails fast with `CONFIG_ERROR` naming the source and the offending
 * field, mirroring how the `packages` config field is validated.
 *
 * @param raw - Parsed JSON value to validate.
 * @param source - Where the definition came from, for error messages.
 * @returns The validated definition.
 * @throws PragmaError with code `CONFIG_ERROR` when the shape is invalid.
 */
export default function validateStoryPackDefinition(
  raw: unknown,
  source: string,
): StoryPackDefinition {
  const obj = requireObject(raw, "story", source);

  const noun = requireString(obj.noun, "noun", source);
  if (!NOUN_PATTERN.test(noun)) {
    throw buildStoryConfigError(
      source,
      `"noun" must be kebab-case, got "${noun}".`,
    );
  }

  const description =
    obj.description === undefined
      ? undefined
      : requireString(obj.description, "description", source);
  const toolDescription =
    obj.toolDescription === undefined
      ? undefined
      : requireString(obj.toolDescription, "toolDescription", source);

  const list = validateList(obj.list, source);
  const verbs = validateVerbs(obj.verbs, source);
  const lookup =
    obj.lookup === undefined ? undefined : validateLookup(obj.lookup, source);

  return {
    noun,
    ...(description !== undefined ? { description } : {}),
    ...(toolDescription !== undefined ? { toolDescription } : {}),
    list,
    ...(verbs ? { verbs } : {}),
    ...(lookup ? { lookup } : {}),
  };
}

/**
 * Verbs the compiler itself emits for a pack noun — an extra verb may not
 * collide with them.
 */
const COMPILED_VERBS = new Set(["list", "lookup", "sample"]);

function validateVerbs(
  raw: unknown,
  source: string,
): readonly StoryPackVerb[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw buildStoryConfigError(source, '"verbs" must be a non-empty array.');
  }
  const seen = new Set<string>();
  return raw.map((entry, index) => {
    const where = `verbs[${index}]`;
    const obj = requireObject(entry, where, source);
    const verb = requireString(obj.verb, `${where}.verb`, source);
    if (!NOUN_PATTERN.test(verb)) {
      throw buildStoryConfigError(
        source,
        `"${where}.verb" must be kebab-case, got "${verb}".`,
      );
    }
    if (COMPILED_VERBS.has(verb)) {
      throw buildStoryConfigError(
        source,
        `"${where}.verb" "${verb}" collides with a compiled verb.`,
      );
    }
    if (seen.has(verb)) {
      throw buildStoryConfigError(source, `duplicate verb "${verb}".`);
    }
    seen.add(verb);
    const description =
      obj.description === undefined
        ? undefined
        : requireString(obj.description, `${where}.description`, source);
    const toolDescription =
      obj.toolDescription === undefined
        ? undefined
        : requireString(
            obj.toolDescription,
            `${where}.toolDescription`,
            source,
          );
    return {
      verb,
      ...(description !== undefined ? { description } : {}),
      ...(toolDescription !== undefined ? { toolDescription } : {}),
      ...validateListShape(entry, where, source),
    };
  });
}

function validateList(
  raw: unknown,
  source: string,
): StoryPackDefinition["list"] {
  return validateListShape(raw, "list", source);
}

/**
 * Validate a list-shaped story half: query, columns, filters, and search.
 *
 * Shared by `list` and (pack v1) extra list verbs, which compile through
 * the same machinery. `where` names the field path for error messages.
 */
function validateListShape(
  raw: unknown,
  where: string,
  source: string,
): StoryPackList {
  const obj = requireObject(raw, where, source);
  const query = requireString(obj.query, `${where}.query`, source);
  // Strip leading PREFIX declarations so the real query verb is checked —
  // "PREFIX ex: <…> CONSTRUCT {…}" must fail here, not at first use.
  const afterPrefixes = query.replace(
    /^(\s*PREFIX\s+[A-Za-z][\w-]*:\s*<[^>]*>)+/i,
    "",
  );
  if (!/^\s*SELECT\s/i.test(afterPrefixes)) {
    throw buildStoryConfigError(
      source,
      `"${where}.query" must be a SPARQL SELECT query.`,
    );
  }

  if (!Array.isArray(obj.columns) || obj.columns.length === 0) {
    throw buildStoryConfigError(
      source,
      `"${where}.columns" must be a non-empty array.`,
    );
  }
  const columns = obj.columns.map((column, index) =>
    validateColumn(column, `${where}.columns[${index}]`, source),
  );
  // Like filters and search below: a column naming a variable the query
  // never binds is a typo that should fail at boot, not render an
  // always-empty column at first use.
  for (const column of columns) {
    if (!referencesVariable(query, column.field)) {
      throw buildStoryConfigError(
        source,
        `column field "?${column.field}" does not appear in "${where}.query".`,
      );
    }
  }

  const filters = validateFilterArray(obj.filters, where, source);
  for (const filter of filters ?? []) {
    if (!referencesVariable(query, filter.variable)) {
      throw buildStoryConfigError(
        source,
        `filter variable "?${filter.variable}" does not appear in "${where}.query".`,
      );
    }
  }

  const search = validateSearch(obj.search, query, where, source);

  return {
    query,
    columns,
    ...(filters ? { filters } : {}),
    ...(search ? { search } : {}),
  };
}

/**
 * Validate a list's free-text `search` declaration.
 *
 * Every searched variable must appear in the query — like filters, this
 * fails a typo at boot instead of a search that silently never matches.
 */
function validateSearch(
  raw: unknown,
  query: string,
  where: string,
  source: string,
): StoryPackSearch | undefined {
  if (raw === undefined) return undefined;
  const obj = requireObject(raw, `${where}.search`, source);
  if (!Array.isArray(obj.variables) || obj.variables.length === 0) {
    throw buildStoryConfigError(
      source,
      `"${where}.search.variables" must be a non-empty array.`,
    );
  }
  const variables = obj.variables.map((value, index) => {
    const variable = requireString(
      value,
      `${where}.search.variables[${index}]`,
      source,
    );
    if (!FIELD_PATTERN.test(variable)) {
      throw buildStoryConfigError(
        source,
        `"${where}.search.variables[${index}]" must name a SELECT variable.`,
      );
    }
    rejectReservedObjectKey(
      variable,
      `${where}.search.variables[${index}]`,
      source,
    );
    if (!referencesVariable(query, variable)) {
      throw buildStoryConfigError(
        source,
        `search variable "?${variable}" does not appear in "${where}.query".`,
      );
    }
    return variable;
  });
  const description =
    obj.description === undefined
      ? undefined
      : requireString(obj.description, `${where}.search.description`, source);
  return {
    variables,
    ...(description !== undefined ? { description } : {}),
  };
}

/**
 * Check that the query mentions the variable (`?name` or `$name`).
 *
 * A textual check, not a SPARQL parse — it exists to fail typos at boot
 * instead of silently filtering every row out at first use.
 */
function referencesVariable(query: string, variable: string): boolean {
  const pattern = new RegExp(`[?$]${variable}\\b`);
  return pattern.test(query);
}

function validateFilterArray(
  raw: unknown,
  where: string,
  source: string,
): readonly StoryPackFilter[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw buildStoryConfigError(
      source,
      `"${where}.filters" must be a non-empty array.`,
    );
  }
  const filters = raw.map((entry, index) =>
    validateFilter(entry, `${where}.filters[${index}]`, source),
  );
  const seen = new Set<string>();
  for (const filter of filters) {
    if (seen.has(filter.param)) {
      throw buildStoryConfigError(
        source,
        `duplicate filter param "${filter.param}".`,
      );
    }
    seen.add(filter.param);
  }
  return filters;
}

function validateFilter(
  raw: unknown,
  where: string,
  source: string,
): StoryPackFilter {
  const obj = requireObject(raw, where, source);
  const param = requireString(obj.param, `${where}.param`, source);
  if (!FILTER_PARAM_PATTERN.test(param)) {
    throw buildStoryConfigError(
      source,
      `"${where}.param" must be a single lowercase word (letters and digits, no hyphens), got "${param}".`,
    );
  }
  if (RESERVED_FILTER_PARAMS.has(param)) {
    throw buildStoryConfigError(
      source,
      `"${where}.param" "${param}" is a reserved name.`,
    );
  }
  rejectReservedObjectKey(param, `${where}.param`, source);
  const variable = requireString(obj.variable, `${where}.variable`, source);
  if (!FIELD_PATTERN.test(variable)) {
    throw buildStoryConfigError(
      source,
      `"${where}.variable" must name a SELECT variable.`,
    );
  }
  rejectReservedObjectKey(variable, `${where}.variable`, source);
  // `values` is optional (pack v1): without it the filter is a free-string
  // parameter matched case-insensitively against the variable — used when
  // the value set is data-driven and cannot be declared.
  const values =
    obj.values === undefined
      ? undefined
      : validateFilterValues(obj.values, where, source);
  const description =
    obj.description === undefined
      ? undefined
      : requireString(obj.description, `${where}.description`, source);
  return {
    param,
    variable,
    ...(values ? { values } : {}),
    ...(description !== undefined ? { description } : {}),
  };
}

function validateFilterValues(
  raw: unknown,
  where: string,
  source: string,
): readonly string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw buildStoryConfigError(
      source,
      `"${where}.values" must be a non-empty array.`,
    );
  }
  const values = raw.map((value, index) =>
    requireString(value, `${where}.values[${index}]`, source),
  );
  const lowered = new Set<string>();
  for (const value of values) {
    const key = value.toLowerCase();
    if (lowered.has(key)) {
      throw buildStoryConfigError(
        source,
        `"${where}.values" contains duplicate value "${value}" ` +
          "(values must be unique, case-insensitively).",
      );
    }
    lowered.add(key);
  }
  return values;
}

function validateColumn(
  raw: unknown,
  where: string,
  source: string,
): StoryPackColumn {
  const obj = requireObject(raw, where, source);
  const field = requireString(obj.field, `${where}.field`, source);
  if (!FIELD_PATTERN.test(field)) {
    throw buildStoryConfigError(
      source,
      `"${where}.field" must name a SELECT variable.`,
    );
  }
  rejectReservedObjectKey(field, `${where}.field`, source);
  const label =
    obj.label === undefined
      ? undefined
      : requireString(obj.label, `${where}.label`, source);
  return { field, ...(label !== undefined ? { label } : {}) };
}

function validateLookup(raw: unknown, source: string): StoryPackLookup {
  const obj = requireObject(raw, "lookup", source);
  const fetchSource = validateLookupSource(obj.source, source);
  const by = requirePredicateTerm(obj.by, "lookup.by", source);
  const type =
    obj.type === undefined
      ? undefined
      : requireTerm(obj.type, "lookup.type", source);
  const description =
    obj.description === undefined
      ? undefined
      : requireString(obj.description, "lookup.description", source);
  const toolDescription =
    obj.toolDescription === undefined
      ? undefined
      : requireString(obj.toolDescription, "lookup.toolDescription", source);
  const types = validateTypeArray(obj.types, source);
  if (type !== undefined && types !== undefined) {
    throw buildStoryConfigError(
      source,
      '"lookup.type" and "lookup.types" are mutually exclusive.',
    );
  }
  const graphqlType =
    obj.graphqlType === undefined
      ? undefined
      : requireGraphqlName(obj.graphqlType, "lookup.graphqlType", source);

  // A graphql-sourced lookup must name the document's fragment target: an
  // explicit graphqlType, or a single `type` whose local name derives it.
  if (fetchSource === "graphql" && graphqlType === undefined && !type) {
    throw buildStoryConfigError(
      source,
      '"lookup.source" "graphql" requires "lookup.graphqlType" (or a single "lookup.type" to derive it from).',
    );
  }

  const fields = validateFieldArray(obj.fields, "lookup.fields", source);
  const sections = validateSectionArray(
    obj.sections,
    "lookup.sections",
    source,
  );
  const expand = validateExpandArray(
    obj.expand,
    "lookup.expand",
    source,
    fetchSource,
  );
  const disclosure = validateDisclosure(obj.disclosure, source);
  const sample = validateSample(obj.sample, source);

  // Cross-check: every `level` must name a declared disclosure level.
  const levels = new Set(disclosure?.levels ?? []);
  for (const entry of expand ?? []) {
    if (entry.level !== undefined && !levels.has(entry.level)) {
      throw buildStoryConfigError(
        source,
        `expand "${entry.name}" level "${entry.level}" is not a declared disclosure level.`,
      );
    }
  }
  for (const entry of [...(fields ?? []), ...(sections ?? [])]) {
    if (entry.level !== undefined && !levels.has(entry.level)) {
      throw buildStoryConfigError(
        source,
        `field "${entry.name}" level "${entry.level}" is not a declared disclosure level.`,
      );
    }
  }

  return {
    ...(fetchSource !== undefined ? { source: fetchSource } : {}),
    by,
    ...(type !== undefined ? { type } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(toolDescription !== undefined ? { toolDescription } : {}),
    ...(types !== undefined ? { types } : {}),
    ...(graphqlType !== undefined ? { graphqlType } : {}),
    ...(fields ? { fields } : {}),
    ...(sections ? { sections } : {}),
    ...(expand ? { expand } : {}),
    ...(disclosure ? { disclosure } : {}),
    ...(sample !== undefined ? { sample } : {}),
  };
}

function validateSample(
  raw: unknown,
  source: string,
): true | StoryPackSample | undefined {
  if (raw === undefined) return undefined;
  if (raw === true) return true;
  const obj = requireObject(raw, "lookup.sample", source);
  if (obj.count !== undefined) {
    // Authors fail fast on an out-of-range default; user-provided counts
    // are clamped at run time by parseSampleCount instead.
    if (
      typeof obj.count !== "number" ||
      !Number.isInteger(obj.count) ||
      obj.count < MIN_SAMPLE_COUNT ||
      obj.count > MAX_SAMPLE_COUNT
    ) {
      throw buildStoryConfigError(
        source,
        `"lookup.sample.count" must be an integer between ${MIN_SAMPLE_COUNT} and ${MAX_SAMPLE_COUNT}.`,
      );
    }
  }
  const description =
    obj.description === undefined
      ? undefined
      : requireString(obj.description, "lookup.sample.description", source);
  const toolDescription =
    obj.toolDescription === undefined
      ? undefined
      : requireString(
          obj.toolDescription,
          "lookup.sample.toolDescription",
          source,
        );
  return {
    ...(obj.count !== undefined ? { count: obj.count as number } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(toolDescription !== undefined ? { toolDescription } : {}),
  };
}

function validateLookupSource(
  raw: unknown,
  source: string,
): StoryPackLookup["source"] {
  if (raw === undefined) return undefined;
  if (raw !== "sparql" && raw !== "graphql") {
    throw buildStoryConfigError(
      source,
      '"lookup.source" must be "sparql" or "graphql".',
    );
  }
  return raw;
}

function validateTypeArray(
  raw: unknown,
  source: string,
): readonly string[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw buildStoryConfigError(
      source,
      '"lookup.types" must be a non-empty array.',
    );
  }
  return raw.map((entry, index) =>
    requireTerm(entry, `lookup.types[${index}]`, source),
  );
}

function validateDisclosure(
  raw: unknown,
  source: string,
): StoryPackDisclosure | undefined {
  if (raw === undefined) return undefined;
  const obj = requireObject(raw, "lookup.disclosure", source);
  if (!Array.isArray(obj.levels) || obj.levels.length === 0) {
    throw buildStoryConfigError(
      source,
      '"lookup.disclosure.levels" must be a non-empty array.',
    );
  }
  const seen = new Set<string>();
  const levels = obj.levels.map((value, index) => {
    const level = requireString(
      value,
      `lookup.disclosure.levels[${index}]`,
      source,
    );
    // Levels derive parameter names (`--detail` enum values and the alias
    // flags), so they are held to the same single-word rule as filter
    // params and may not shadow reserved parameter names.
    if (!FILTER_PARAM_PATTERN.test(level)) {
      throw buildStoryConfigError(
        source,
        `disclosure level "${level}" must be a single lowercase word (letters and digits, no hyphens).`,
      );
    }
    if (RESERVED_LEVEL_NAMES.has(level)) {
      throw buildStoryConfigError(
        source,
        `disclosure level "${level}" is a reserved name.`,
      );
    }
    rejectReservedObjectKey(
      level,
      `lookup.disclosure.levels[${index}]`,
      source,
    );
    if (seen.has(level)) {
      throw buildStoryConfigError(
        source,
        `duplicate disclosure level "${level}".`,
      );
    }
    seen.add(level);
    return level;
  });
  const defaultLevel =
    obj.default === undefined
      ? undefined
      : requireString(obj.default, "lookup.disclosure.default", source);
  if (defaultLevel !== undefined && !seen.has(defaultLevel)) {
    throw buildStoryConfigError(
      source,
      `disclosure default "${defaultLevel}" is not one of the declared levels.`,
    );
  }
  return {
    levels,
    ...(defaultLevel !== undefined ? { default: defaultLevel } : {}),
  };
}

function validateExpandArray(
  raw: unknown,
  where: string,
  source: string,
  fetchSource: StoryPackLookup["source"],
): readonly StoryPackExpand[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw buildStoryConfigError(source, `"${where}" must be an array.`);
  }
  const names = new Set<string>();
  return raw.map((entry, index) => {
    const expand = validateExpand(
      entry,
      `${where}[${index}]`,
      source,
      fetchSource,
    );
    if (names.has(expand.name)) {
      throw buildStoryConfigError(
        source,
        `duplicate expand name "${expand.name}" in "${where}".`,
      );
    }
    names.add(expand.name);
    return expand;
  });
}

function validateExpand(
  raw: unknown,
  where: string,
  source: string,
  fetchSource: StoryPackLookup["source"],
): StoryPackExpand {
  const obj = requireObject(raw, where, source);
  const name = requireString(obj.name, `${where}.name`, source);
  if (!FIELD_PATTERN.test(name)) {
    throw buildStoryConfigError(
      source,
      `"${where}.name" must be a simple identifier.`,
    );
  }
  rejectReservedObjectKey(name, `${where}.name`, source);
  const relation = requirePredicateTerm(
    obj.relation,
    `${where}.relation`,
    source,
  );
  const graphqlField =
    obj.graphqlField === undefined
      ? undefined
      : requireGraphqlName(obj.graphqlField, `${where}.graphqlField`, source);
  if (obj.kind !== undefined && obj.kind !== "list" && obj.kind !== "table") {
    throw buildStoryConfigError(
      source,
      `"${where}.kind" must be "list" or "table".`,
    );
  }
  if (!Array.isArray(obj.select) || obj.select.length === 0) {
    throw buildStoryConfigError(
      source,
      `"${where}.select" must be a non-empty array.`,
    );
  }
  const select: StoryPackExpandSelect[] = obj.select.map((entry, index) =>
    validateExpandSelect(
      entry,
      `${where}.select[${index}]`,
      source,
      fetchSource,
    ),
  );
  const selectNames = new Set<string>();
  for (const entry of select) {
    if (selectNames.has(entry.name)) {
      throw buildStoryConfigError(
        source,
        `duplicate select name "${entry.name}" in "${where}.select".`,
      );
    }
    selectNames.add(entry.name);
  }
  const heading =
    obj.heading === undefined
      ? undefined
      : requireString(obj.heading, `${where}.heading`, source);
  // Membership in the declared levels is cross-checked in validateLookup.
  const level =
    obj.level === undefined
      ? undefined
      : requireString(obj.level, `${where}.level`, source);
  return {
    name,
    relation,
    ...(graphqlField !== undefined ? { graphqlField } : {}),
    select,
    ...(heading !== undefined ? { heading } : {}),
    ...(obj.kind !== undefined ? { kind: obj.kind as "list" | "table" } : {}),
    ...(obj.showWhenEmpty === true ? { showWhenEmpty: true } : {}),
    ...(level !== undefined ? { level } : {}),
  };
}

/**
 * Validate one expand `select` entry: a plain child field, or — on
 * graphql-sourced lookups only — one nested `{ name, relation, select }`
 * level. A nested entry's own select admits only plain scalar fields, so
 * nesting is bounded at exactly one extra hop by construction.
 */
function validateExpandSelect(
  raw: unknown,
  where: string,
  source: string,
  fetchSource: StoryPackLookup["source"],
): StoryPackExpandSelect {
  const obj = requireObject(raw, where, source);
  if (obj.relation === undefined) {
    return validateField(raw, where, source);
  }
  if (fetchSource !== "graphql") {
    throw buildStoryConfigError(
      source,
      `"${where}" nests a relation, which requires lookup.source "graphql" ` +
        "(the SPARQL expand sub-SELECT is single-hop).",
    );
  }
  const name = requireString(obj.name, `${where}.name`, source);
  if (!FIELD_PATTERN.test(name)) {
    throw buildStoryConfigError(
      source,
      `"${where}.name" must be a simple identifier.`,
    );
  }
  const relation = requireTerm(obj.relation, `${where}.relation`, source);
  const graphqlField =
    obj.graphqlField === undefined
      ? undefined
      : requireGraphqlName(obj.graphqlField, `${where}.graphqlField`, source);
  if (!Array.isArray(obj.select) || obj.select.length === 0) {
    throw buildStoryConfigError(
      source,
      `"${where}.select" must be a non-empty array.`,
    );
  }
  const select: StoryPackExpandField[] = obj.select.map((entry, index) => {
    const inner = requireObject(entry, `${where}.select[${index}]`, source);
    if (inner.relation !== undefined) {
      throw buildStoryConfigError(
        source,
        `"${where}.select[${index}]" nests deeper than one level (nested expands admit only scalar fields).`,
      );
    }
    return validateField(entry, `${where}.select[${index}]`, source);
  });
  const nested: StoryPackNestedExpand = {
    name,
    relation,
    ...(graphqlField !== undefined ? { graphqlField } : {}),
    select,
  };
  return nested;
}

function validateFieldArray(
  raw: unknown,
  where: string,
  source: string,
): readonly StoryPackField[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw buildStoryConfigError(source, `"${where}" must be an array.`);
  }
  return raw.map((entry, index) =>
    validateField(entry, `${where}[${index}]`, source),
  );
}

function validateSectionArray(
  raw: unknown,
  where: string,
  source: string,
): readonly StoryPackSection[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw buildStoryConfigError(source, `"${where}" must be an array.`);
  }
  return raw.map((entry, index) => {
    const base = validateField(entry, `${where}[${index}]`, source);
    const obj = entry as Record<string, unknown>;
    if (obj.kind !== undefined && obj.kind !== "field" && obj.kind !== "code") {
      throw buildStoryConfigError(
        source,
        `"${where}[${index}].kind" must be "field" or "code".`,
      );
    }
    return {
      ...base,
      ...(obj.kind !== undefined ? { kind: obj.kind as "field" | "code" } : {}),
    };
  });
}

function validateField(
  raw: unknown,
  where: string,
  source: string,
): StoryPackField {
  const obj = requireObject(raw, where, source);
  const name = requireString(obj.name, `${where}.name`, source);
  if (!FIELD_PATTERN.test(name)) {
    throw buildStoryConfigError(
      source,
      `"${where}.name" must be a simple identifier.`,
    );
  }
  rejectReservedObjectKey(name, `${where}.name`, source);
  const property = requirePredicateTerm(
    obj.property,
    `${where}.property`,
    source,
  );
  const label =
    obj.label === undefined
      ? undefined
      : requireString(obj.label, `${where}.label`, source);
  const graphqlField =
    obj.graphqlField === undefined
      ? undefined
      : requireGraphqlName(obj.graphqlField, `${where}.graphqlField`, source);
  // Membership in the declared levels is cross-checked in validateLookup.
  const level =
    obj.level === undefined
      ? undefined
      : requireString(obj.level, `${where}.level`, source);
  return {
    name,
    property,
    ...(label !== undefined ? { label } : {}),
    ...(graphqlField !== undefined ? { graphqlField } : {}),
    ...(level !== undefined ? { level } : {}),
  };
}

/** Require a legal GraphQL name (`graphqlField`/`graphqlType` overrides). */
function requireGraphqlName(
  raw: unknown,
  where: string,
  source: string,
): string {
  const value = requireString(raw, where, source);
  if (!GRAPHQL_NAME_PATTERN.test(value)) {
    throw buildStoryConfigError(
      source,
      `"${where}" must be a legal GraphQL name.`,
    );
  }
  return value;
}

function requireObject(
  raw: unknown,
  where: string,
  source: string,
): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw buildStoryConfigError(source, `"${where}" must be an object.`);
  }
  return raw as Record<string, unknown>;
}

function requireString(raw: unknown, where: string, source: string): string {
  if (typeof raw !== "string" || raw.trim() === "") {
    throw buildStoryConfigError(
      source,
      `"${where}" must be a non-empty string.`,
    );
  }
  return raw;
}

/** Require a prefixed name (`ex:Recipe`) or an embeddable absolute IRI. */
function requireTerm(raw: unknown, where: string, source: string): string {
  const value = requireString(raw, where, source);
  if (value.includes("://")) {
    if (EMBEDDABLE_IRI_PATTERN.test(value)) return value;
    throw buildStoryConfigError(
      source,
      `"${where}" is not a valid IRI (no whitespace or <>" characters).`,
    );
  }
  if (PREFIXED_NAME_PATTERN.test(value)) return value;
  throw buildStoryConfigError(
    source,
    `"${where}" must be a prefixed name (ex:Recipe) or an absolute IRI.`,
  );
}

/**
 * Require a predicate term: a single term or a slash-separated SPARQL
 * property path of prefixed names (`cs:hasCategory/cs:slug`).
 *
 * Paths are only meaningful in predicate position (`lookup.by` and
 * `fields[].property`/`sections[].property`); class terms go through
 * `requireTerm` and reject paths.
 */
function requirePredicateTerm(
  raw: unknown,
  where: string,
  source: string,
): string {
  const value = requireString(raw, where, source);
  if (value.includes("://") || !value.includes("/")) {
    return requireTerm(value, where, source);
  }
  const segments = value.split("/");
  for (const segment of segments) {
    if (!PREFIXED_NAME_PATTERN.test(segment)) {
      throw buildStoryConfigError(
        source,
        `"${where}" property path segment "${segment}" must be a prefixed name.`,
      );
    }
  }
  return value;
}

function buildStoryConfigError(source: string, message: string): PragmaError {
  return PragmaError.configError(`Invalid story in ${source}: ${message}`);
}
