import type { TimeZone } from "../types.js";

const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hour12: false,
};

/**
 * Creates a default timestamp formatter that updates when the timezone changes. The formatter formats dates as `YYYY-MM-DD HH:mm:ss.SSS` in UTC, runtime local time, or an explicit timezone.
 *
 * @param getTimeZone A function that returns the current timezone.
 * @returns An object with a reactive `format` function that formats dates according to the current timezone.
 */
export function useDefaultTimestampFormatter(getTimeZone: () => TimeZone) {
  const dateTimeFormat = $derived.by(() => {
    const timeZone = getTimeZone();

    try {
      return new Intl.DateTimeFormat("en-US", {
        ...dateTimeFormatOptions,
        timeZone: timeZone === "local" ? undefined : timeZone,
      });
    } catch (error) {
      if (error instanceof RangeError) {
        console.warn(
          `Invalid timezone "${timeZone}" provided to Log component. Falling back to UTC.`,
        );
      } else {
        throw error;
      }
    }

    return new Intl.DateTimeFormat("en-US", {
      ...dateTimeFormatOptions,
      timeZone: "UTC",
    });
  });

  const format = (date: Date) => {
    const parts = dateTimeFormat.formatToParts(date);
    const partsObject = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );

    return `${partsObject.year}-${partsObject.month}-${partsObject.day} ${partsObject.hour}:${partsObject.minute}:${partsObject.second}.${partsObject.fractionalSecond}`;
  };

  return { format };
}
