import { Temporal } from "@js-temporal/polyfill";

/**
 * Parser for Temporal.Instant.
 * @param time - instance, date or string to parse
 * @throws Error if time is invalid
 */
function parseInstant(time: Temporal.Instant | Date | string) {
  if (time instanceof Temporal.Instant) {
    return time;
  }
  if (time instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(time.getTime());
  }
  try {
    return Temporal.Instant.from(time);
  } catch (_e) {
    throw new Error(
      `Invalid time string (ISO string or Date object expected): ${time}`,
    );
  }
}

export default parseInstant;
