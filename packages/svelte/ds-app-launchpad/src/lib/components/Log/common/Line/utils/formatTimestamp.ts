import type { TimeZone } from "../../../types.js";

export function formatTimestamp(
  date: Date,
  timeZone: TimeZone = "UTC",
): string {
  return timeZone === "UTC"
    ? formatToUTCString(date)
    : formatToLocalString(date);
}

function formatToLocalString(date: Date) {
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);

  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${ms}`;
}

function formatToUTCString(date: Date) {
  const YYYY = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const DD = pad(date.getUTCDate());
  const HH = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);

  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${ms}`;
}

function pad(num: number, length = 2): string {
  return String(num).padStart(length, "0");
}
