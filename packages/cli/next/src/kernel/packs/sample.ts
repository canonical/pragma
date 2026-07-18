/**
 * Sample-count parsing and uniform random selection for the `sample` verb.
 *
 * Ported from the v1 shared helpers: a missing count falls back to the default,
 * a non-integer is rejected as invalid input, and a valid integer is clamped to
 * the supported 1–5 range. Selection is a Fisher-Yates partial shuffle.
 */

import { PragmaError } from "../error/PragmaError.js";
import type { PackLookup } from "./types.js";

/** Smallest number of samples the `sample` verb returns. */
export const MIN_SAMPLE_COUNT = 1;
/** Largest number of samples the `sample` verb returns. */
export const MAX_SAMPLE_COUNT = 5;
/** Number of samples returned when the count is omitted. */
export const DEFAULT_SAMPLE_COUNT = 2;

/** The default sample count a lookup declares, or the built-in default. */
export function sampleDefaultCount(lookup: PackLookup): number {
  const sample = lookup.sample;
  if (sample && sample !== true && typeof sample.count === "number") {
    return sample.count;
  }
  return DEFAULT_SAMPLE_COUNT;
}

/**
 * Resolve the raw `count` arg into a clamped sample count.
 *
 * @throws PragmaError INVALID_INPUT when `raw` is present but not an integer.
 */
export function parseSampleCount(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_SAMPLE_COUNT;
  }
  const text = String(raw).trim();
  if (!/^-?\d+$/.test(text)) {
    throw PragmaError.invalidInput("count", String(raw), {
      recovery: {
        message: `Provide an integer between ${MIN_SAMPLE_COUNT} and ${MAX_SAMPLE_COUNT}.`,
      },
    });
  }
  return Math.max(MIN_SAMPLE_COUNT, Math.min(MAX_SAMPLE_COUNT, Number(text)));
}

/** Pick `count` random items without replacement (Fisher-Yates partial shuffle). */
export function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const n = Math.min(count, arr.length);
  if (n === 0) return [];
  const copy = [...arr];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy.slice(0, n);
}
