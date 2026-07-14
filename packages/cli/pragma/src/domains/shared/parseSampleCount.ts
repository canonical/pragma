/**
 * Parse and validate the `--count` argument shared by every `sample` command.
 *
 * A missing count falls back to the default. A non-numeric or non-integer
 * value is rejected as invalid input (so the command exits non-zero) rather
 * than silently coercing to `NaN` and returning zero samples. A valid integer
 * is clamped to the supported 1–5 range.
 */

import { PragmaError } from "../../error/index.js";

/** Smallest number of samples a `sample` command will return. */
export const MIN_SAMPLE_COUNT = 1;
/** Largest number of samples a `sample` command will return. */
export const MAX_SAMPLE_COUNT = 5;
/** Number of samples returned when `--count` is omitted. */
export const DEFAULT_SAMPLE_COUNT = 2;

/**
 * Resolve the raw `--count` param into a clamped sample count.
 *
 * @param raw - The raw param value (`params.count`), possibly undefined.
 * @returns An integer in [MIN_SAMPLE_COUNT, MAX_SAMPLE_COUNT].
 * @throws PragmaError INVALID_INPUT when `raw` is present but not an integer.
 */
export default function parseSampleCount(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_SAMPLE_COUNT;
  }

  // Accept only a plain decimal integer. Number() would otherwise coerce hex
  // ("0x5"), scientific ("1e1"), and whitespace-padded forms, none of which a
  // user should be able to pass to --count.
  const text = String(raw).trim();
  if (!/^-?\d+$/.test(text)) {
    throw PragmaError.invalidInput("count", String(raw), {
      recovery: {
        message: `Provide an integer between ${MIN_SAMPLE_COUNT} and ${MAX_SAMPLE_COUNT}.`,
      },
    });
  }

  const parsed = Number(text);
  return Math.max(MIN_SAMPLE_COUNT, Math.min(MAX_SAMPLE_COUNT, parsed));
}
