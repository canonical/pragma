export const units = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", (1000 * 60 * 60 * 24 * 365) / 12],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
  ["second", 1000],
] satisfies Array<[unit: Intl.RelativeTimeFormatUnit, millis: number]>;
