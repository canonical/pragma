import type { PredicateOperand } from "./types.js";

/**
 * The rank of an operand in the total order over operand values: type tag
 * first, then value within type. Plain code-point comparison, not locale
 * collation, so canonical order is environment-stable and never ties on
 * distinct strings.
 */
export default function rankOperand(operand: PredicateOperand): string {
  return `${typeof operand}:${String(operand)}`;
}
