import {
  MACHINES_QUERY_VARIABLES,
  SORTED_FIELDS,
  STATUS_ORDER,
} from "./constants.js";
import type { ApiProblem, ApiQuery } from "./types.js";

/**
 * The text fields this endpoint looks through for text, each with the
 * `where` member holding the text it must contain.
 */
const CONTAINS_MEMBERS = {
  name: "nameContains",
  region: "regionContains",
  owner: "ownerContains",
} as const satisfies Readonly<Record<string, string>>;

/** A query and the forward page of it the GraphQL endpoint is asked for. */
type GraphQLRequest = {
  readonly query: ApiQuery;
  /** Records skipped before the page. */
  readonly offset: number;
  readonly first: number;
};

/** The members the endpoint's filter input declares. */
const WHERE_MEMBERS: readonly string[] = [
  "status",
  "coresGte",
  "coresLte",
  ...Object.values(CONTAINS_MEMBERS),
  "search",
];

/**
 * The offset one cursor the endpoint handed back starts after, spelled in
 * base64 so no client reads it as a number, or null when it is not one of
 * the endpoint's cursors.
 */
const decodeCursor = (after: string): number | null => {
  try {
    // Digits alone, as the endpoint spells an offset: `Number` would also
    // read an empty string, a space or `1.0` as one.
    const text = atob(after);
    const offset = Number(text);
    return /^\d+$/.test(text) && Number.isSafeInteger(offset) ? offset : null;
  } catch {
    return null;
  }
};

/** A JSON input object's members by name, or null when the value is not one. */
const coerceInputObject = (
  value: unknown,
): Readonly<Record<string, unknown>> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;

/**
 * A list input, as GraphQL coerces one: null reads as empty, and one value
 * as a list of it.
 */
const coerceListInput = (value: unknown): readonly unknown[] => {
  if (value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

/** Whether a value is one of the statuses the endpoint knows. */
const isStatus = (value: unknown): value is string =>
  typeof value === "string" && STATUS_ORDER.includes(value);

/** The first member an input carries that its type does not declare. */
const findUndeclared = (
  input: Readonly<Record<string, unknown>>,
  declared: readonly string[],
): string | undefined =>
  Object.keys(input).find((name) => !declared.includes(name));

/**
 * Read the `orderBy` input: at most one term, each naming a known field and
 * then a direction, or null when none is given.
 */
const readOrderBy = (value: unknown): ApiQuery["sort"] | ApiProblem => {
  const terms = coerceListInput(value);
  if (terms.length > 1) {
    return { reason: "this endpoint orders by one term at a time" };
  }
  const [candidate] = terms;
  if (candidate === undefined) {
    return null;
  }
  const term = coerceInputObject(candidate);
  if (term === null) {
    return { reason: `${JSON.stringify(candidate)} is not an ordering` };
  }
  const { field = null, direction = null } = term;
  if (field === null) {
    return { reason: "an ordering names no field" };
  }
  if (typeof field !== "string" || !SORTED_FIELDS.includes(field)) {
    return {
      reason: `${JSON.stringify(field)} is not a field this endpoint orders by`,
    };
  }
  if (direction === null) {
    return { reason: "an ordering names no direction" };
  }
  if (direction !== "ASC" && direction !== "DESC") {
    return { reason: `${JSON.stringify(direction)} is not a direction` };
  }
  return { field, direction: direction === "DESC" ? "desc" : "asc" };
};

/**
 * Read the GraphQL endpoint's variables, as its resolver would: a forward
 * page by `first` and `after`, a `where` input whose text members hold the
 * text each field must contain, and an `orderBy` of at most one term.
 *
 * The variables arrive as JSON, so each is read, never trusted: a variable
 * or member left out or given as null is not given, and a list input given
 * one value reads as a list of it. A variable or member the query does not
 * declare, a cursor it never handed back, a filter input or ordering that is
 * not an object, a status it does not know, a bound that is not a number,
 * text that is not a string, an ordering naming no field or direction, a
 * field or direction it cannot run, or a page of no records is a problem,
 * never a broader answer.
 */
export default function readGraphQLQuery(
  variables: Readonly<Record<string, unknown>>,
): GraphQLRequest | ApiProblem {
  const undeclared = findUndeclared(variables, MACHINES_QUERY_VARIABLES);
  if (undeclared !== undefined) {
    return { reason: `this endpoint does not accept "${undeclared}"` };
  }
  const {
    first = null,
    after = null,
    where = null,
    orderBy = null,
  } = variables;
  if (typeof first !== "number" || !Number.isSafeInteger(first) || first < 1) {
    return { reason: `"first" is not a positive whole number` };
  }
  const offset =
    after === null ? 0 : typeof after === "string" ? decodeCursor(after) : null;
  if (offset === null) {
    return { reason: "the cursor is not one this endpoint handed back" };
  }
  const filter = where === null ? {} : coerceInputObject(where);
  if (filter === null) {
    return { reason: `${JSON.stringify(where)} is not a filter input` };
  }
  const undeclaredMember = findUndeclared(filter, WHERE_MEMBERS);
  if (undeclaredMember !== undefined) {
    return {
      reason: `this endpoint does not accept "where.${undeclaredMember}"`,
    };
  }
  const {
    status = null,
    coresGte = null,
    coresLte = null,
    search = null,
  } = filter;
  const given = coerceListInput(status);
  const unknown = given.find((candidate) => !isStatus(candidate));
  if (unknown !== undefined) {
    return { reason: `${JSON.stringify(unknown)} is not a status` };
  }
  const statuses = given.filter(isStatus);
  if (coresGte !== null && typeof coresGte !== "number") {
    return { reason: `${JSON.stringify(coresGte)} is not a number of cores` };
  }
  if (coresLte !== null && typeof coresLte !== "number") {
    return { reason: `${JSON.stringify(coresLte)} is not a number of cores` };
  }
  const contains: Record<string, string> = {};
  for (const [field, member] of Object.entries(CONTAINS_MEMBERS)) {
    const text = filter[member] ?? null;
    if (text !== null && typeof text !== "string") {
      return { reason: `${JSON.stringify(text)} is not text` };
    }
    if (text !== null && text !== "") {
      contains[field] = text;
    }
  }
  if (search !== null && typeof search !== "string") {
    return { reason: `${JSON.stringify(search)} is not text` };
  }
  const sort = readOrderBy(orderBy);
  if (sort !== null && "reason" in sort) {
    return sort;
  }
  return {
    query: {
      contains,
      statuses,
      cores: { gte: coresGte, lte: coresLte },
      search: search === null || search === "" ? null : search,
      sort,
    },
    offset,
    first,
  };
}
