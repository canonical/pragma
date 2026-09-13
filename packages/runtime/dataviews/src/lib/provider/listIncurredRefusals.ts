import type { SourceRefusal } from "../result/index.js";

/** Two refusals for the same clause: the reason's wording does not count. */
const isSameRefusal = (a: SourceRefusal, b: SourceRefusal): boolean =>
  a.part === b.part &&
  a.code === b.code &&
  a.field === b.field &&
  a.operator === b.operator;

/**
 * The refusals a command incurs: those the query it produces would be
 * refused for that the query it starts from is not. A refusal the query
 * already carries is not the command's doing, so a command that removes
 * one refused clause while another stands is applied, and answers with
 * nothing.
 *
 * Pure: a comparison of two lists.
 */
export default function listIncurredRefusals(
  before: readonly SourceRefusal[],
  after: readonly SourceRefusal[],
): readonly SourceRefusal[] {
  if (before.length === 0) {
    return after;
  }
  return Object.freeze(
    after.filter(
      (refusal) => !before.some((standing) => isSameRefusal(standing, refusal)),
    ),
  );
}
