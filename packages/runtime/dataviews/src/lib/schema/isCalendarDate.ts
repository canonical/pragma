const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The days of each month in a common year; February gains one in a leap year. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * Whether a string is a real ISO-8601 calendar date, `YYYY-MM-DD`.
 *
 * A real calendar check: `Date.parse` is not portable here — JavaScriptCore
 * accepts out-of-range dates such as 2026-02-30 by rolling them over.
 *
 * @experimental Newly public so ordering can read a date field's row value
 * through the same check the schema applies to a filter bound.
 */
export default function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const days =
    month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH.at(month - 1) ?? 0);
  return month >= 1 && month <= 12 && day >= 1 && day <= days;
}
