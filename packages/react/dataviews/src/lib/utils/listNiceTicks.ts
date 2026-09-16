/** The most ticks an axis is given, past which its two ends stand alone. */
const MOST_TICKS = 1000;

/**
 * Evenly spaced round numbers covering a span, for an axis: steps of one,
 * two or five times a power of ten, about `count` steps apart. Returned with
 * the axis's two ends — `low` at or below the lower end of the span and
 * `high` at or above the upper — which are its first and last ticks. A span
 * of no width still gets two ticks, one step apart, so an axis always has a
 * length.
 *
 * A span no round step can divide into ticks — one of its ends is not a
 * finite number, the steps between them outrun the integers a number counts
 * exactly, or more ticks were asked for than an axis may carry — is answered
 * with its own two ends and nothing between: an axis drawn from the values
 * themselves, rather than a loop that cannot end.
 */
export default function listNiceTicks(
  from: number,
  to: number,
  count: number,
): {
  readonly ticks: readonly number[];
  readonly low: number;
  readonly high: number;
} {
  const lower = Math.min(from, to);
  const upper = Math.max(from, to);
  const ends = { ticks: [lower, upper], low: lower, high: upper };
  const span = upper - lower || Math.abs(upper) || 1;
  const rough = span / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const factor = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  const step = factor * magnitude;
  const first = Math.floor(lower / step);
  const last = Math.max(Math.ceil(upper / step), first + 1);
  const steps = last - first;
  if (
    !Number.isSafeInteger(first) ||
    !Number.isSafeInteger(last) ||
    steps > MOST_TICKS
  ) {
    return ends;
  }
  // Rounded to a precision well past any axis's, so 0.1 × 3 is 0.3.
  const place = (multiple: number): number =>
    Number((multiple * step).toPrecision(12));
  const ticks = Array.from({ length: steps + 1 }, (_unused, at) =>
    place(first + at),
  );
  return { ticks, low: place(first), high: place(last) };
}
