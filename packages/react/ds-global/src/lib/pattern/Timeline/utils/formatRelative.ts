type Division = { amount: number; unit: Intl.RelativeTimeFormatUnit };

const DIVISIONS: readonly Division[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

const formatterCache = new Map<string, Intl.RelativeTimeFormat>();

function getFormatter(locale: string): Intl.RelativeTimeFormat {
  let formatter = formatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    formatterCache.set(locale, formatter);
  }
  return formatter;
}

/** Format an ISO timestamp relative to `now` (e.g. "2 hours ago"). */
export function formatRelative(
  iso: string,
  now: number,
  locale: string,
): string {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp) || Number.isNaN(now)) {
    return "";
  }
  let duration = (timestamp - now) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return getFormatter(locale).format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return "";
}
