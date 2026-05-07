import type { TimeZone } from "../../../types.js";

export class TimestampFormatter {
  private static readonly FORMATTER_OPTIONS: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  };
  private static readonly LOCAL_TZ_CACHE_KEY = Symbol("local");

  private readonly timeZoneFormatterCache = new Map<
    TimeZone | typeof TimestampFormatter.LOCAL_TZ_CACHE_KEY,
    Intl.DateTimeFormat
  >();

  /**
   * Formats a date as `YYYY-MM-DD HH:mm:ss.SSS` in UTC, runtime local time, or an explicit timezone.
   *
   * Invalid explicit timezones fall back to UTC and emit a warning.
   */
  format(date: Date, timeZone: TimeZone): string {
    const formatter = this.getFormatter(timeZone);

    const parts = formatter.formatToParts(date);
    const partsObject = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return `${partsObject.year}-${partsObject.month}-${partsObject.day} ${partsObject.hour}:${partsObject.minute}:${partsObject.second}.${partsObject.fractionalSecond}`;
  }

  private getFormatter(timeZone: TimeZone): Intl.DateTimeFormat {
    const cacheKey =
      timeZone === "local" ? TimestampFormatter.LOCAL_TZ_CACHE_KEY : timeZone;

    const cachedFormatter = this.timeZoneFormatterCache.get(cacheKey);
    if (cachedFormatter) return cachedFormatter;

    const formatterOptions: Intl.DateTimeFormatOptions = {
      ...TimestampFormatter.FORMATTER_OPTIONS,
      timeZone: timeZone === "local" ? undefined : timeZone,
    };

    try {
      const formatter = new Intl.DateTimeFormat("en-US", formatterOptions);

      this.timeZoneFormatterCache.set(cacheKey, formatter);
      return formatter;
    } catch (error) {
      if (error instanceof RangeError && timeZone !== "UTC") {
        console.warn(
          `Invalid timezone "${timeZone}" provided to TimestampFormatter.format. Falling back to UTC. Future warnings for this timezone will not be shown.`,
        );

        const formatter = this.getFormatter("UTC");
        this.timeZoneFormatterCache.set(cacheKey, formatter);
        return formatter;
      }

      throw error;
    }
  }
}
