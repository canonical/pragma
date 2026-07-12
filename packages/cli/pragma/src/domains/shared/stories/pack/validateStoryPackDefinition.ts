import { PragmaError } from "#error";
import type {
  StoryPackColumn,
  StoryPackDefinition,
  StoryPackField,
  StoryPackLookup,
  StoryPackSection,
} from "./types.js";

const NOUN_PATTERN = /^[a-z][a-z0-9-]*$/;
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** A prefixed name (`ex:Recipe`) — prefix + local part, no path slashes. */
const PREFIXED_NAME_PATTERN = /^[A-Za-z][\w-]*:[^/<>"\s]+$/;

/** An absolute IRI that can be safely embedded as `<iri>` in SPARQL. */
const EMBEDDABLE_IRI_PATTERN = /^[A-Za-z][\w+.-]*:\/\/[^<>"\s]+$/;

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
  const lookup =
    obj.lookup === undefined ? undefined : validateLookup(obj.lookup, source);

  return {
    noun,
    ...(description !== undefined ? { description } : {}),
    ...(toolDescription !== undefined ? { toolDescription } : {}),
    list,
    ...(lookup ? { lookup } : {}),
  };
}

function validateList(
  raw: unknown,
  source: string,
): StoryPackDefinition["list"] {
  const obj = requireObject(raw, "list", source);
  const query = requireString(obj.query, "list.query", source);
  // Strip leading PREFIX declarations so the real query verb is checked —
  // "PREFIX ex: <…> CONSTRUCT {…}" must fail here, not at first use.
  const afterPrefixes = query.replace(
    /^(\s*PREFIX\s+[A-Za-z][\w-]*:\s*<[^>]*>)+/i,
    "",
  );
  if (!/^\s*SELECT\s/i.test(afterPrefixes)) {
    throw buildStoryConfigError(
      source,
      '"list.query" must be a SPARQL SELECT query.',
    );
  }

  if (!Array.isArray(obj.columns) || obj.columns.length === 0) {
    throw buildStoryConfigError(
      source,
      '"list.columns" must be a non-empty array.',
    );
  }
  const columns = obj.columns.map((column, index) =>
    validateColumn(column, `list.columns[${index}]`, source),
  );

  return { query, columns };
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
  const label =
    obj.label === undefined
      ? undefined
      : requireString(obj.label, `${where}.label`, source);
  return { field, ...(label !== undefined ? { label } : {}) };
}

function validateLookup(raw: unknown, source: string): StoryPackLookup {
  const obj = requireObject(raw, "lookup", source);
  const by = requirePredicateTerm(obj.by, "lookup.by", source);
  const type =
    obj.type === undefined
      ? undefined
      : requireTerm(obj.type, "lookup.type", source);

  const fields = validateFieldArray(obj.fields, "lookup.fields", source);
  const sections = validateSectionArray(
    obj.sections,
    "lookup.sections",
    source,
  );

  return {
    by,
    ...(type !== undefined ? { type } : {}),
    ...(fields ? { fields } : {}),
    ...(sections ? { sections } : {}),
  };
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
  const property = requirePredicateTerm(
    obj.property,
    `${where}.property`,
    source,
  );
  const label =
    obj.label === undefined
      ? undefined
      : requireString(obj.label, `${where}.label`, source);
  return { name, property, ...(label !== undefined ? { label } : {}) };
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
