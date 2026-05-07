import type { TimeZone } from "../../../types.js";

const LOCAL_TZ_CACHE_KEY = Symbol("local");
const timeZoneFormatterCache = new Map<
  TimeZone | typeof LOCAL_TZ_CACHE_KEY,
  Intl.DateTimeFormat
>();

/**
 * Formats a date as `YYYY-MM-DD HH:mm:ss.SSS` in UTC, runtime local time, or an explicit timezone.
 *
 * Invalid explicit timezones fall back to UTC and emit a warning.
 */
export function formatTimestamp(date: Date, timeZone: TimeZone): string {
  return format(date, getFormatter(timeZone));
}

function format(date: Date, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(date);
  const partsObject = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${partsObject.year}-${partsObject.month}-${partsObject.day} ${partsObject.hour}:${partsObject.minute}:${partsObject.second}.${partsObject.fractionalSecond}`;
}

function getFormatter(timeZone: TimeZone): Intl.DateTimeFormat {
  const cacheKey = timeZone === "local" ? LOCAL_TZ_CACHE_KEY : timeZone;

  const cachedFormatter = timeZoneFormatterCache.get(cacheKey);
  if (cachedFormatter) return cachedFormatter;

  const formatterOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  };

  if (timeZone !== "local") {
    formatterOptions.timeZone = timeZone;
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", formatterOptions);

    timeZoneFormatterCache.set(cacheKey, formatter);
    return formatter;
  } catch (error) {
    if (error instanceof RangeError && timeZone !== "UTC") {
      console.warn(
        `Invalid timezone "${timeZone}" provided to formatTimestamp. Falling back to UTC.`,
      );

      return getFormatter("UTC");
    }

    throw error;
  }
}
