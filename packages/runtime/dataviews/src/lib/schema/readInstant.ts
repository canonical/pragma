import isCalendarDate from "./isCalendarDate.js";

/**
 * A calendar date, optionally with a time of day and the offset that fixes
 * it to an instant. A time without an offset is left out deliberately:
 * ECMA-262 reads it as local time, which orders one way on a server and
 * another in a browser.
 */
const INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2}))?$/;

/**
 * Epoch milliseconds at a validated UTC date and time. `Date.UTC` reads a
 * year below 100 as the twentieth century, so those years are set by hand.
 */
const computeUtcMillis = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  millis: number,
): number => {
  if (year >= 100) {
    return Date.UTC(year, month - 1, day, hours, minutes, seconds, millis);
  }
  const at = new Date(0);
  at.setUTCFullYear(year, month - 1, day);
  at.setUTCHours(hours, minutes, seconds, millis);
  return at.getTime();
};

/** A captured part as a number, zero when the pattern left it out. */
const readPart = (part: string | undefined): number =>
  part === undefined ? 0 : Number(part);

/**
 * The instant an ISO-8601 string stands at, or null when the pattern does
 * not read it or it names a day, time or offset the calendar does not have.
 */
const parseInstant = (value: string): number | null => {
  const parts = INSTANT.exec(value);
  if (parts === null) {
    return null;
  }
  const hours = readPart(parts.at(4));
  const minutes = readPart(parts.at(5));
  const seconds = readPart(parts.at(6));
  const offset = parts.at(8) ?? "Z";
  const offsetHours = offset === "Z" ? 0 : Number(offset.slice(1, 3));
  const offsetMinutes = offset === "Z" ? 0 : Number(offset.slice(4, 6));
  if (
    !isCalendarDate(value.slice(0, 10)) ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59 ||
    offsetHours > 23 ||
    offsetMinutes > 59
  ) {
    return null;
  }
  // Milliseconds are the first three fractional digits; the rest are below
  // what an instant resolves.
  const millis = readPart(parts.at(7)?.slice(0, 3).padEnd(3, "0"));
  const at = computeUtcMillis(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)),
    Number(value.slice(8, 10)),
    hours,
    minutes,
    seconds,
    millis,
  );
  const shift = (offsetHours * 60 + offsetMinutes) * 60_000;
  return offset.startsWith("-") ? at + shift : at - shift;
};

/**
 * The instant a date field's row value stands at, or null when it stands at
 * none. A date field filters over calendar dates, while a row may carry the
 * same day several ways, so ordering reads each as one number: a `Date`,
 * epoch milliseconds, a calendar-date string read as UTC midnight, or an
 * ISO-8601 string carrying `Z` or an offset. Everything else — an
 * unparseable string, a local-time string, an invalid `Date`, a non-finite
 * number — has no instant, and orders as empty.
 */
export default function readInstant(value: unknown): number | null {
  if (typeof value === "string") {
    return parseInstant(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  // Asked of the value itself, not by `instanceof`: a Date from another
  // realm — an iframe, a worker, a vm context — is still a Date, and
  // anything else merely dressed as one throws.
  try {
    const at = Date.prototype.getTime.call(value);
    return Number.isNaN(at) ? null : at;
  } catch {
    return null;
  }
}
