import { STATUS_ORDER } from "./constants.js";
import type { ApiQuery, ApiRecord } from "./types.js";

/** Text compares as the endpoint's collation does: root, numeric. */
const collator = new Intl.Collator("en-u-kn-true");

/** The sortable key of a value, or null when it is empty. */
const readKey = (field: string, value: unknown): number | string | null => {
  if (field === "status") {
    const rank = typeof value === "string" ? STATUS_ORDER.indexOf(value) : -1;
    return rank === -1 ? null : rank;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  return typeof value === "string" && value !== "" ? value : null;
};

/**
 * Compare two records by one ordered term. Empty values order last in both
 * directions; a status orders by the endpoint's lifecycle, text by its
 * collation and numbers by value.
 */
export default function compareRecords(
  sort: NonNullable<ApiQuery["sort"]>,
): (a: ApiRecord, b: ApiRecord) => number {
  const sign = sort.direction === "asc" ? 1 : -1;
  return (a, b) => {
    const left = readKey(sort.field, a[sort.field]);
    const right = readKey(sort.field, b[sort.field]);
    if (left === null || right === null) {
      return left === right ? 0 : left === null ? 1 : -1;
    }
    const order =
      typeof left === "string" && typeof right === "string"
        ? collator.compare(left, right)
        : Number(left) - Number(right);
    return sign * order;
  };
}
