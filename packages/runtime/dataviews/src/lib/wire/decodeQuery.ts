import {
  collapseSortTerms,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type GroupTerm,
  OPERATOR_ARITY,
  type Predicate,
  type PredicateOperand,
  type PredicateOperator,
  type ResultWindow,
  type Slice,
  type SortTerm,
} from "../query/index.js";
import {
  resolveFieldKind,
  type Schema,
  type SchemaFieldDefinition,
  type SchemaPredicateResult,
} from "../schema/index.js";
import { refusalsOf, type SourceCapabilities } from "../source/index.js";
import {
  OPERATOR_DELIMITER,
  RESERVED_QUERY_KEYS,
  SUFFIXED_OPERATORS,
} from "./constants.js";
import readWireField from "./readWireField.js";
import spellWireKey from "./spellWireKey.js";
import type { DecodedQuery, DecodeQueryConfig, QueryIssue } from "./types.js";

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
  // A key read off the parameters has at least the value it was read from.
  return values[0] as string;
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
  definition: SchemaFieldDefinition,
  filter: Predicate[],
  issues: QueryIssue[],
): void => {
  const { field } = definition;
  const kind = resolveFieldKind(definition.kind);
  let operator: PredicateOperator = "eq";
  if (key.includes(OPERATOR_DELIMITER)) {
    const suffix = key.slice(field.length + OPERATOR_DELIMITER.length);
    if (!isOperator(suffix)) {
      issues.push({ parameter: key, reason: `unknown operator "${suffix}"` });
      return;
    }
    operator = suffix;
  }
  if (
    OPERATOR_ARITY[operator] === "none" ||
    (kind.input.kind === "none" && kind.operators.length > 0)
  ) {
    // The zero-value operator carries no operands — its presence is the
    // predicate, never a truthiness test on its value — and a kind that
    // filters without a text input has none to parse: the schema answers
    // for the operator alone. A kind that filters by nothing at all reads
    // its values below, so the report says why, not which operator.
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
      operator === "eq" ? operands : operands.slice(0, 1),
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
    const refusals = refusalsOf(capabilities, {
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
      keeps(spellWireKey(predicate.field, predicate.operator), {
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
  const refusals = refusalsOf(capabilities, {
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
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function decodeQuery(config: DecodeQueryConfig): DecodedQuery {
  const { schema, params, capabilities } = config;

  const issues: QueryIssue[] = [];
  const filter: Predicate[] = [];
  let sort: readonly SortTerm[] = [];
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
        } else if (schema.findField(term.field) === undefined) {
          // A field with no kind cannot be compared, so a term naming one is
          // as malformed as a term with no direction.
          issues.push({
            parameter: key,
            reason: `"${term.field}" is not a field of this collection`,
          });
        } else {
          terms.push(term);
        }
      }
      // An ordering is kept whole or not at all: dropping one term would
      // promote the next into a precedence nobody asked for. A field spelled
      // twice is not a refusal, only a respelling — the first occurrence is
      // the ordering, and the canonical link is written back.
      sort = terms.length === values.length ? collapseSortTerms(terms) : [];
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
    const definition = schema.findField(readWireField(key));
    if (definition === undefined) {
      continue;
    }
    readPredicate(key, values, schema, definition, filter, issues);
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
