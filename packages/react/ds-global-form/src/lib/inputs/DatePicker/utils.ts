import { type CalendarDate, parseDate } from "@internationalized/date";

/**
 * Parse an ISO-8601 date string ("YYYY-MM-DD") into a CalendarDate.
 * Returns null for empty/invalid input — the field tier stores the ISO string,
 * and this is the boundary conversion to the @internationalized/date value.
 */
export function parseISO(
  value: string | null | undefined,
): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

/** Serialize a CalendarDate to an ISO-8601 date string ("YYYY-MM-DD"). */
export function toISO(date: CalendarDate | null | undefined): string {
  return date ? date.toString() : "";
}
