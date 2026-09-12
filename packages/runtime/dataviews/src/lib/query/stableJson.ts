/**
 * One query part as a comparable string.
 *
 * `JSON.stringify` writes every non-finite number as `null`, which is a
 * legal operand, so a naive key cannot tell `NaN` from `null`. Marking the
 * non-finite values with an object instead keeps them apart: the operand
 * domain has no objects, so the marker collides with nothing a caller can
 * write.
 */
export default function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, member) =>
    typeof member === "number" && !Number.isFinite(member)
      ? { nonfinite: String(member) }
      : member,
  );
}
