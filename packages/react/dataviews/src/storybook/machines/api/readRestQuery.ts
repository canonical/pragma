import { SORTED_FIELDS, STATUS_ORDER } from "./constants.js";
import type { ApiProblem, ApiQuery, ApiTextMatch } from "./types.js";

/** The text fields this endpoint looks through, with how it matches each. */
const TEXT_OPERATORS: Readonly<
  Record<string, readonly ApiTextMatch["operator"][]>
> = {
  name: ["contains", "startsWith"],
  region: ["contains", "startsWith"],
};

/** The keys a status set is read from, with the operator each spells. */
const STATUS_KEYS: Readonly<Record<string, "isAny" | "isNone">> = {
  status: "isAny",
  status__isAny: "isAny",
  status__isNone: "isNone",
};

/** The page size a request that names none is answered with. */
const DEFAULT_PAGE_SIZE = 50;

/** A positive whole number, as the endpoint accepts a page or a size. */
const POSITIVE_WHOLE = /^[1-9]\d*$/;

/** A query and the page of it the REST endpoint is asked for. */
type RestRequest = {
  readonly query: ApiQuery;
  readonly page: number;
  readonly size: number;
};

/**
 * Read the REST endpoint's query parameters, as its own backend would:
 * `status` repeated, or `status__isAny`, for the statuses a machine is any
 * of, `status__isNone` for those it is none of, `cores__gte` and
 * `cores__lte`, `<field>__contains` and `<field>__startsWith` on the text
 * fields it can look through, `q`, one `sort=<field>__<direction>`, `page`
 * and `size`. A blank value is a control left empty and is dropped on its
 * own, as the grammar drops it. Anything else — an unknown parameter, a key
 * with more than one delimiter, a second ordered term, a malformed value — is
 * a problem, never a broader answer.
 */
export default function readRestQuery(
  params: URLSearchParams,
): RestRequest | ApiProblem {
  const text: ApiTextMatch[] = [];
  const statuses: { isAny: string[]; isNone: string[] } = {
    isAny: [],
    isNone: [],
  };
  const cores: { gte: number | null; lte: number | null } = {
    gte: null,
    lte: null,
  };
  let search: string | null = null;
  let sort: ApiQuery["sort"] = null;
  let page = 1;
  let size = DEFAULT_PAGE_SIZE;
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key).filter((value) => value !== "");
    const statusOperator = STATUS_KEYS[key];
    if (statusOperator !== undefined) {
      const unknown = values.find((status) => !STATUS_ORDER.includes(status));
      if (unknown !== undefined) {
        return { reason: `${JSON.stringify(unknown)} is not a status` };
      }
      statuses[statusOperator].push(...values);
      continue;
    }
    const [value, ...extra] = values;
    if (value === undefined) {
      continue;
    }
    if (extra.length > 0) {
      return {
        reason:
          key === "sort"
            ? "this endpoint orders by one term at a time"
            : `"${key}" takes one value`,
      };
    }
    const parts = key.split("__");
    const [field = "", operator] = parts;
    const isAddress = parts.length === 2;
    const textOperator = TEXT_OPERATORS[field]?.find(
      (candidate) => candidate === operator,
    );
    if (key === "q") {
      search = value;
    } else if (key === "sort") {
      const segments = value.split("__");
      if (segments.length > 2) {
        return { reason: `"sort" takes one field and one direction` };
      }
      const [sorted = "", direction = ""] = segments;
      if (sorted === "") {
        return { reason: "a sort names no field" };
      }
      if (!SORTED_FIELDS.includes(sorted)) {
        return {
          reason: `${JSON.stringify(sorted)} is not a field this endpoint orders by`,
        };
      }
      if (direction === "") {
        return { reason: "a sort names no direction" };
      }
      if (direction !== "asc" && direction !== "desc") {
        return { reason: `${JSON.stringify(direction)} is not a direction` };
      }
      sort = { field: sorted, direction };
    } else if (key === "page" || key === "size") {
      if (!POSITIVE_WHOLE.test(value)) {
        return { reason: `"${key}" is not a positive whole number` };
      }
      if (key === "page") {
        page = Number(value);
      } else {
        size = Number(value);
      }
    } else if (
      isAddress &&
      field === "cores" &&
      (operator === "gte" || operator === "lte")
    ) {
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        return { reason: `${JSON.stringify(value)} is not a number of cores` };
      }
      cores[operator] = Number(value);
    } else if (isAddress && textOperator !== undefined) {
      text.push({ field, operator: textOperator, text: value });
    } else {
      return { reason: `this endpoint does not accept "${key}"` };
    }
  }
  return {
    query: { text, statuses, cores, search, sort },
    page,
    size,
  };
}
