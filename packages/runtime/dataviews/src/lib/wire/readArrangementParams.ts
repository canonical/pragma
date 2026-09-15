import { HIDDEN_QUERY_KEY, ORDER_QUERY_KEY } from "./constants.js";
import type { ArrangementParams } from "./types.js";

/**
 * The column arrangement a set of parameters carries, or null for none.
 *
 * An order is carried whole, and the hidden columns with it: an order with
 * no hidden column hides none, since a list of no ids has no spelling. Hidden
 * columns carried alone leave the order to whatever lies beneath. A blank
 * value is a form control left empty, as it is for every other parameter,
 * and names no column.
 */
export default function readArrangementParams(
  params: URLSearchParams,
): ArrangementParams | null {
  if (!params.has(ORDER_QUERY_KEY) && !params.has(HIDDEN_QUERY_KEY)) {
    return null;
  }
  const listIds = (key: string): readonly string[] =>
    params.getAll(key).filter((id) => id !== "");
  return {
    order: params.has(ORDER_QUERY_KEY) ? listIds(ORDER_QUERY_KEY) : null,
    hidden: listIds(HIDDEN_QUERY_KEY),
  };
}
