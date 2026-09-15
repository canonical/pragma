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
      code: "malformed",
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
      code: "malformed",
      reason: `"${value}" is not a positive integer`,
    });
    return fallback;
  }
  // Digits alone are not enough: past the safe range a page or size reads
  // as Infinity or as a neighbouring number.
  if (!Number.isSafeInteger(parsed)) {
    issues.push({
      parameter: key,
      code: "malformed",
      reason: `"${value}" is too large`,
    });
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

/**
 * Keep an enforced predicate, or report why the parameter was refused. A set
 * operator read under a second spelling of its address — `status` and
 * `status__isAny` — is one predicate, holding the operands of both.
 */
const record = (
  result: SchemaPredicateResult,
  key: string,
  filter: Predicate[],
  issues: QueryIssue[],
): void => {
  if (result.status === "valid") {
    const { predicate } = result;
    const kept = filter.find(
      (candidate) =>
        candidate.field === predicate.field &&
        candidate.operator === predicate.operator,
    );
    if (kept === undefined) {
      filter.push(predicate);
      return;
    }
    filter.splice(filter.indexOf(kept), 1, {
      ...predicate,
      operands: [...kept.operands, ...predicate.operands],
    });
    return;
  }
  issues.push({ parameter: key, code: "invalid", reason: result.reason });
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
  let operator: PredicateOperator = "isAny";
  if (key.includes(OPERATOR_DELIMITER)) {
    const suffix = key.slice(field.length + OPERATOR_DELIMITER.length);
    if (!isOperator(suffix)) {
      issues.push({
        parameter: key,
        code: "malformed",
        reason: `unknown operator "${suffix}"`,
      });
      return;
    }
    operator = suffix;
  }
  if (
    !kind.operators.includes(operator) ||
    OPERATOR_ARITY[operator] === "none" ||
    kind.input.kind === "none"
  ) {
    // An operator the kind does not accept is refused for the operator,
    // before any value is read. The zero-value operator carries no operands
    // — its presence is the predicate, never a truthiness test on its value
    // — and a kind that filters without a text input has none to parse: the
    // schema answers for the operator alone.
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
    // The schema reads a blank input as incomplete, and no blank reaches
    // it: the decoder dropped them before parsing.
    /* v8 ignore next 3 -- unreachable: blanks are dropped above */
    if (parsed.status === "incomplete") {
      continue;
    }
    issues.push({ parameter: key, code: "invalid", reason: parsed.reason });
  }
  if (operands.length === 0) {
    return;
  }
  const isSet = OPERATOR_ARITY[operator] === "many";
  if (!isSet && operands.length > 1) {
    issues.push({
      parameter: key,
      code: "malformed",
      reason: `"${key}" takes one value; the extra values were ignored`,
    });
  }
  record(
    schema.predicateFor(
      field,
      operator,
      isSet ? operands : operands.slice(0, 1),
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
      issues.push({ parameter, code: refusal.code, reason: refusal.reason });
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
    issues.push({
      parameter: "cursor",
      code: refusal.code,
      reason: refusal.reason,
    });
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
 * alone: unknown, not invalid. A blank value is a form control left empty
 * and reads as no clause, so a GET form submits cleanly.
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
    // A blank value is a control left empty — a bound nobody typed in, a
    // select on its empty option — submitted as a native form submits it:
    // no clause, and nothing to report.
    const values = params.getAll(key).filter((value) => value !== "");
    if (values.length === 0) {
      continue;
    }
    if (key === "q") {
      search = singletonOf(key, values, issues);
      continue;
    }
    if (key === "sort") {
      const terms: SortTerm[] = [];
      for (const value of values) {
        const term = sortTermOf(value);
        if (term === null) {
          issues.push({
            parameter: key,
            code: "malformed",
            reason: `"${value}" is not an ordered sort term`,
          });
        } else if (schema.findField(term.field) === undefined) {
          // A field with no kind cannot be compared, so a term naming one
          // refuses the ordering as a term with no direction does.
          issues.push({
            parameter: key,
            code: "unknown-field",
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
      group = values.map((value) => ({ field: value }));
      continue;
    }
    if (key === "cursor") {
      cursor = singletonOf(key, values, issues);
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
