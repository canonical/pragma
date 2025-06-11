import { Temporal } from "@js-temporal/polyfill";

type FormatterOptions = {
  /** The threshold in seconds for considering the time as "now". */
  nowThreshold: number;

  /** The keyword to use for "now". */
  nowKeyword: string;

  /**
   * The Intl.RelativeTimeFormat instance to use for formatting.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
   */
  relativeTimeFormat: Intl.RelativeTimeFormat;
};

/**
 * Formats a given instant as a human-readable time relative to the current time.
 * @param instant The instant to format.
 * @param options The options to use for formatting.
 * @returns A human-readable relative time string
 */
function formatHumanTime(
  instant: Temporal.Instant,
  options: FormatterOptions,
): string {
  const now = Temporal.Now.instant();
  const deltaSeconds =
    (instant.epochMilliseconds - now.epochMilliseconds) / 1000;
  const absDeltaSeconds = Math.abs(deltaSeconds);

  if (absDeltaSeconds < options.nowThreshold) {
    return options.nowKeyword;
  }

  const timeZone = Temporal.Now.timeZoneId() || "UTC";
  const instantZDT = instant.toZonedDateTimeISO(timeZone);
  const nowZDT = now.toZonedDateTimeISO(timeZone);
  const diff = instantZDT.since(nowZDT, { largestUnit: "years" });

  const units = [
    "years",
    "months",
    "days",
    "hours",
    "minutes",
    "seconds",
  ] satisfies Intl.RelativeTimeFormatUnit[];

  let rtfUnit: Intl.RelativeTimeFormatUnit = "seconds";
  let rtfValue = 0;

  for (const unit of units) {
    const value = diff[unit];
    if (value !== 0) {
      rtfUnit = unit;
      rtfValue = value;
      break;
    }
  }

  if (rtfValue === 0) {
    return options.nowKeyword;
  }

  return options.relativeTimeFormat.format(rtfValue, rtfUnit);
}

export default formatHumanTime;
