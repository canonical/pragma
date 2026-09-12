import DEFAULT_WINDOW from "../query/defaultWindow.js";
import EMPTY_SLICE from "../query/emptySlice.js";
import type {
  GroupTerm,
  Predicate,
  PredicateOperand,
  PredicateOperator,
  ResultWindow,
  Slice,
  SortTerm,
} from "../query/types.js";
import type { Schema, SchemaPredicateResult } from "../schema/createSchema.js";
import type { SchemaFieldDefinition } from "../schema/types.js";
import supportsRequest from "../source/supportsRequest.js";
import type { SourceCapabilities } from "../source/types.js";
import type { DecodedQuery, DecodeQueryConfig, QueryIssue } from "./types.js";
import {
  fieldOfWireKey,
  OPERATOR_DELIMITER,
  RESERVED_QUERY_KEYS,
  SUFFIXED_OPERATORS,
  wireKeyOf,
} from "./wireGrammar.js";

const DIGITS = /^\d+$/;

const isOperator = (
  suffix: string,
): suffix is (typeof SUFFIXED_OPERATORS)[number] =>
  SUFFIXED_OPERATORS.some((operator) => operator === suffix);

/** Read a parameter the grammar spells once, reporting any extra values. */
const singletonOf = (
  key: string,
  values: readonly string[],
  issues: QueryIssue[],
): string => {
  if (values.length > 1) {
    issues.push({
      parameter: key,
      reason: `"${key}" takes one value; the extra values were ignored`,
    });
  }
  return values[0];
};

/** Read one window value, falling back rather than paging somewhere absurd. */
const windowValueOf = (
  key: string,
  values: readonly string[],
  issues: QueryIssue[],
  fallback: number,
): number => {
  const value = singletonOf(key, values, issues);
  const parsed = Number(value);
  if (!DIGITS.test(value) || parsed < 1) {
    issues.push({
      parameter: key,
      reason: `"${value}" is not a positive integer`,
    });
    return fallback;
  }
  // Digits alone are not enough: past the safe range a page or size reads
  // as Infinity or as a neighbouring number.
  if (!Number.isSafeInteger(parsed)) {
    issues.push({ parameter: key, reason: `"${value}" is too large` });
    return fallback;
  }
  return parsed;
};

/** Read one ordered sort term, or null when the value is not one. */
const sortTermOf = (value: string): SortTerm | null => {
  const at = value.indexOf(OPERATOR_DELIMITER);
  if (at < 1) {
    return null;
  }
  const direction = value.slice(at + OPERATOR_DELIMITER.length);
  if (direction !== "asc" && direction !== "desc") {
    return null;
  }
  return { field: value.slice(0, at), direction };
};

/** Keep an enforced predicate, or report why the parameter was refused. */
const record = (
  result: SchemaPredicateResult,
  key: string,
  filter: Predicate[],
  issues: QueryIssue[],
): void => {
  if (result.status === "valid") {
    filter.push(result.predicate);
    return;
  }
  issues.push({ parameter: key, reason: result.reason });
};

/** Read one field's parameter into a schema-enforced predicate. */
const readPredicate = (
  key: string,
  values: readonly string[],
  schema: Schema<readonly SchemaFieldDefinition[]>,
  kind: SchemaFieldDefinition["kind"],
  filter: Predicate[],
  issues: QueryIssue[],
): void => {
  const field = fieldOfWireKey(key);
  let operator: PredicateOperator = "eq";
  if (key.includes(OPERATOR_DELIMITER)) {
    const suffix = key.slice(field.length + OPERATOR_DELIMITER.length);
    if (!isOperator(suffix)) {
      issues.push({ parameter: key, reason: `unknown operator "${suffix}"` });
      return;
    }
    operator = suffix;
  }
  if (operator === "isSet" || kind === "flag") {
    // The zero-value operator carries no operands — its presence is the
    // predicate, never a truthiness test on its value — and a flag field
    // accepts no other operator. The schema says so in both directions.
    record(schema.predicateFor(field, operator, []), key, filter, issues);
    return;
  }
  const operands: PredicateOperand[] = [];
  for (const value of values) {
    const parsed = schema.validateInput(field, value);
    if (parsed.status === "valid") {
      operands.push(...parsed.operands);
      continue;
    }
    issues.push({
      parameter: key,
      reason:
        parsed.status === "incomplete"
          ? `"${key}" was given no value`
          : parsed.reason,
    });
  }
  if (operands.length === 0) {
    return;
  }
  if (operator !== "eq" && operands.length > 1) {
    issues.push({
      parameter: key,
      reason: `"${key}" takes one value; the extra values were ignored`,
    });
  }
  record(
    schema.predicateFor(
      field,
      operator,
      operator === "eq" ? operands : [operands[0]],
    ),
    key,
    filter,
    issues,
  );
};

/**
 * Leave out every clause the source cannot execute, reporting each. Each
 * clause is checked alone, over the default window, so one refusal names the
 * one parameter that caused it — a window the source cannot address is the
 * window's own refusal, not every clause's. An ordering is kept or refused
 * whole, never truncated.
 */
const executableOf = (
  slice: Slice,
  capabilities: SourceCapabilities,
  issues: QueryIssue[],
): Slice => {
  const keeps = (parameter: string, clause: Slice): boolean => {
    const refusals = supportsRequest(capabilities, {
      slice: clause,
      window: DEFAULT_WINDOW,
    });
    if (refusals.length === 0) {
      return true;
    }
    for (const refusal of refusals) {
      issues.push({ parameter, reason: refusal.reason });
    }
    return false;
  };
  return {
    filter: slice.filter.filter((predicate) =>
      keeps(wireKeyOf(predicate.field, predicate.operator), {
        ...EMPTY_SLICE,
        filter: [predicate],
      }),
    ),
    search: keeps("q", { ...EMPTY_SLICE, search: slice.search })
      ? slice.search
      : null,
    sort: keeps("sort", { ...EMPTY_SLICE, sort: slice.sort }) ? slice.sort : [],
    group: keeps("group", { ...EMPTY_SLICE, group: slice.group })
      ? slice.group
      : [],
  };
};

/**
 * The window a source can address, reporting what it cannot. Only the token
 * is refusable here: a decoded window collapses nothing, and a page number
 * out of a cursor source's reach is that source's own refusal at execution,
 * which needs the trail this layer does not have.
 */
const addressableWindow = (
  window: ResultWindow,
  capabilities: SourceCapabilities,
  issues: QueryIssue[],
): ResultWindow => {
  const refusals = supportsRequest(capabilities, {
    slice: EMPTY_SLICE,
    window,
  });
  if (refusals.length === 0) {
    return window;
  }
  for (const refusal of refusals) {
    issues.push({ parameter: "cursor", reason: refusal.reason });
  }
  return { ...window, cursor: null };
};

/**
 * Read one parameter set as a query and its window.
 *
 * The schema enforces every owned clause: values are parsed to their field's
 * type, operators are checked against the field's kind, and a clause that
 * fails is left out and reported. With the source's capabilities, a clause
 * it cannot execute is refused the same way. A parameter naming no field of
 * this collection — delimited or not — belongs to the host and is left
 * alone: unknown, not invalid.
 */
export default function decodeQuery(config: DecodeQueryConfig): DecodedQuery {
  const { schema, params, capabilities } = config;
  const kinds = new Map<string, SchemaFieldDefinition["kind"]>();
  for (const definition of schema.fields) {
    kinds.set(definition.field, definition.kind);
  }

  const issues: QueryIssue[] = [];
  const filter: Predicate[] = [];
  let sort: SortTerm[] = [];
  let search: string | null = null;
  let group: GroupTerm[] = [];
  let page = DEFAULT_WINDOW.page;
  let size = DEFAULT_WINDOW.size;
  let cursor = DEFAULT_WINDOW.cursor;

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    if (key === "q") {
      const value = singletonOf(key, values, issues);
      search = value === "" ? null : value;
      continue;
    }
    if (key === "sort") {
      const terms: SortTerm[] = [];
      for (const value of values) {
        const term = sortTermOf(value);
        if (term === null) {
          issues.push({
            parameter: key,
            reason: `"${value}" is not an ordered sort term`,
          });
        } else {
          terms.push(term);
        }
      }
      // An ordering is kept whole or not at all: dropping one term would
      // promote the next into a precedence nobody asked for.
      sort = terms.length === values.length ? terms : [];
      continue;
    }
    if (key === "group") {
      const levels: GroupTerm[] = [];
      for (const value of values) {
        if (value === "") {
          issues.push({ parameter: key, reason: `"${key}" must name a field` });
        } else {
          levels.push({ field: value });
        }
      }
      // A grouping is kept whole or not at all: dropping one level would
      // nest the rest under a parent nobody asked for.
      group = levels.length === values.length ? levels : [];
      continue;
    }
    if (key === "cursor") {
      const value = singletonOf(key, values, issues);
      if (value === "") {
        issues.push({
          parameter: key,
          reason: `"${key}" must carry the token a page handed back`,
        });
        continue;
      }
      cursor = value;
      continue;
    }
    if (key === "page") {
      page = windowValueOf(key, values, issues, page);
      continue;
    }
    if (key === "size") {
      size = windowValueOf(key, values, issues, size);
      continue;
    }
    if (RESERVED_QUERY_KEYS.includes(key)) {
      // A reserved name the grammar does not read here — the annotation
      // names — is the host's to interpret.
      continue;
    }
    const kind = kinds.get(fieldOfWireKey(key));
    if (kind === undefined) {
      continue;
    }
    readPredicate(key, values, schema, kind, filter, issues);
  }

  const read: Slice = { filter, search, sort, group };
  // Collapse has no spelling, so a decoded window never collapses anything.
  const readWindow: ResultWindow = { page, size, cursor, collapsed: [] };
  if (capabilities === undefined || capabilities === null) {
    return { slice: read, window: readWindow, issues };
  }
  return {
    slice: executableOf(read, capabilities, issues),
    window: addressableWindow(readWindow, capabilities, issues),
    issues,
  };
}
