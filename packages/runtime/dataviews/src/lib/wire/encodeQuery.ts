import canonicalSlice from "../query/canonicalSlice.js";
import type { PredicateOperand } from "../query/types.js";
import type { EncodeQueryConfig } from "./types.js";
import { isOwnedKey, OPERATOR_DELIMITER, wireKeyOf } from "./wireGrammar.js";

/** The presence marker of the zero-value operator. */
const IS_SET_VALUE = "1";

/**
 * A number in the plain decimal the buffer grammar reads. A number's own
 * string form switches to exponent notation beyond 1e21 and below 1e-6;
 * moving the point respells the same shortest round-trip digits, so the
 * value read back is exactly the value written.
 */
const plainDecimal = (value: number): string => {
  const spelled = String(value);
  const at = spelled.indexOf("e");
  if (at === -1) {
    return spelled;
  }
  const exponent = Number(spelled.slice(at + 1));
  const mantissa = spelled.slice(0, at);
  const negative = mantissa.startsWith("-");
  const [whole, fraction = ""] = (
    negative ? mantissa.slice(1) : mantissa
  ).split(".");
  const digits = `${whole}${fraction}`;
  const point = whole.length + exponent;
  const body =
    exponent < 0
      ? `0.${"0".repeat(-point)}${digits}`
      : digits.padEnd(point, "0");
  return negative ? `-${body}` : body;
};

/** One operand as the buffer grammar spells it. */
const operandText = (operand: PredicateOperand): string =>
  typeof operand === "number" ? plainDecimal(operand) : String(operand);

/**
 * Write one query and its window as URL parameters.
 *
 * The slice is canonicalized first, so the same query always produces the
 * same parameters: equality operands are a set, ordered sort terms keep
 * their precedence, and an empty search is no search. Only the grammar's
 * own keys are replaced in `preserve` — every host parameter survives, in
 * its original order and with its duplicates.
 */
export default function encodeQuery(
  config: EncodeQueryConfig,
): URLSearchParams {
  const { schema, slice, window } = config;
  const params = new URLSearchParams(config.preserve);
  for (const key of new Set(params.keys())) {
    if (isOwnedKey(key, schema.hasField)) {
      params.delete(key);
    }
  }

  const canonical = canonicalSlice(slice);
  for (const predicate of canonical.filter) {
    const key = wireKeyOf(predicate.field, predicate.operator);
    if (predicate.operator === "isSet") {
      params.append(key, IS_SET_VALUE);
      continue;
    }
    for (const operand of predicate.operands) {
      // An option is matched by its own string form; a bound is read by
      // the number grammar.
      params.append(
        key,
        predicate.operator === "eq" ? String(operand) : operandText(operand),
      );
    }
  }
  if (canonical.search !== null) {
    params.set("q", canonical.search);
  }
  for (const term of canonical.sort) {
    params.append(
      "sort",
      `${term.field}${OPERATOR_DELIMITER}${term.direction}`,
    );
  }
  if (canonical.group !== null) {
    params.set("group", canonical.group);
  }
  // Written whenever given: a window read back is the window that was
  // displayed, never a default the reader has to know.
  if (window !== null) {
    params.set("page", String(window.page));
    params.set("size", String(window.size));
  }
  return params;
}
