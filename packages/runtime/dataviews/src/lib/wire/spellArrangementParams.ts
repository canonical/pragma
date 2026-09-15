import { HIDDEN_QUERY_KEY, ORDER_QUERY_KEY } from "./constants.js";
import type { ArrangementParams } from "./types.js";

/**
 * A set of parameters carrying a column arrangement in place of the one they
 * carried: the order, when there is one, and the hidden columns, each as a
 * repeated column id; with none, neither. Every other parameter survives,
 * in its original order and with its duplicates, and the parameters given
 * are not changed.
 *
 * What `readArrangementParams` reads back is the arrangement spelled, except
 * that an order of no columns, having no spelling, reads back as none.
 */
export default function spellArrangementParams(
  params: URLSearchParams,
  arrangement: ArrangementParams | null,
): URLSearchParams {
  const spelled = new URLSearchParams(params);
  spelled.delete(ORDER_QUERY_KEY);
  spelled.delete(HIDDEN_QUERY_KEY);
  for (const id of arrangement?.order ?? []) {
    spelled.append(ORDER_QUERY_KEY, id);
  }
  for (const id of arrangement?.hidden ?? []) {
    spelled.append(HIDDEN_QUERY_KEY, id);
  }
  return spelled;
}
