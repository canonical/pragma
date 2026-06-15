import {
  type CalendarDate,
  endOfMonth,
  getDayOfWeek,
  getLocalTimeZone,
  isSameDay,
  isSameMonth,
  startOfMonth,
  today,
} from "@internationalized/date";
import type React from "react";
import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CalendarProps } from "./types.js";
import "./Calendar.css";

const componentCssClassName = "ds calendar";

const DAYS_PER_WEEK = 7;
const MAX_WEEKS = 6;

/** Clamp a date into the [min, max] window (inclusive). */
function constrainValue(
  date: CalendarDate,
  minValue?: CalendarDate,
  maxValue?: CalendarDate,
): CalendarDate {
  let result = date;
  if (minValue && result.compare(minValue) < 0) result = minValue;
  if (maxValue && result.compare(maxValue) > 0) result = maxValue;
  return result;
}

/** A date is disabled when it falls outside the [min, max] window. */
function isDateDisabled(
  date: CalendarDate,
  minValue?: CalendarDate,
  maxValue?: CalendarDate,
): boolean {
  if (minValue && date.compare(minValue) < 0) return true;
  if (maxValue && date.compare(maxValue) > 0) return true;
  return false;
}

/**
 * Build the localized weekday-abbreviation header (e.g. Su, Mo, Tu…) in the
 * locale's first-day order. We anchor on a real week and walk seven days from
 * its locale start so DST / calendar quirks never skew the labels.
 */
function getWeekDays(locale: string, timeZone: string): string[] {
  const reference = today(timeZone);
  // Step back to the locale's first weekday (offset 0).
  const weekStart = reference.subtract({
    days: getDayOfWeek(reference, locale),
  });
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const labels: string[] = [];
  for (let i = 0; i < DAYS_PER_WEEK; i++) {
    labels.push(formatter.format(weekStart.add({ days: i }).toDate(timeZone)));
  }
  return labels;
}

/**
 * Compute the grid of dates for the month containing `focusedDate`, padded with
 * leading days from the previous month and trailing days from the next so every
 * row holds 7 cells. Mirrors react-aria's `getDatesInWeek`/`weeksInMonth`.
 */
function getCalendarGrid(
  focusedDate: CalendarDate,
  locale: string,
): CalendarDate[][] {
  const monthStart = startOfMonth(focusedDate);
  const monthEnd = endOfMonth(focusedDate);
  // Offset of the 1st within its week (0 = first column for this locale).
  const leadingOffset = getDayOfWeek(monthStart, locale);
  const gridStart = monthStart.subtract({ days: leadingOffset });

  const daysInMonth = monthEnd.day;
  const totalCells = leadingOffset + daysInMonth;
  const weeks = Math.min(MAX_WEEKS, Math.ceil(totalCells / DAYS_PER_WEEK));

  const grid: CalendarDate[][] = [];
  let cursor = gridStart;
  for (let week = 0; week < weeks; week++) {
    const row: CalendarDate[] = [];
    for (let day = 0; day < DAYS_PER_WEEK; day++) {
      row.push(cursor);
      cursor = cursor.add({ days: 1 });
    }
    grid.push(row);
  }
  return grid;
}

type CalendarCellProps = {
  date: CalendarDate;
  isOutsideMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isUnavailable: boolean;
  isFocused: boolean;
  fullDateLabel: string;
  onSelect: (date: CalendarDate) => void;
  cellRef: React.Ref<HTMLButtonElement> | undefined;
};

/** A single day button rendered as a `role="gridcell"`. */
function CalendarCell({
  date,
  isOutsideMonth,
  isSelected,
  isToday,
  isDisabled,
  isUnavailable,
  isFocused,
  fullDateLabel,
  onSelect,
  cellRef,
}: CalendarCellProps): ReactElement {
  // Outside-month days keep grid alignment but are inert / not selectable.
  const isInteractive = !isOutsideMonth && !isDisabled && !isUnavailable;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <button> carrying role="gridcell" is the focusable day cell of the ARIA grid pattern.
    <button
      ref={cellRef}
      type="button"
      role="gridcell"
      className="calendar-cell"
      aria-label={fullDateLabel}
      aria-selected={isSelected || undefined}
      aria-disabled={!isInteractive || undefined}
      aria-current={isToday ? "date" : undefined}
      tabIndex={isFocused ? 0 : -1}
      data-today={isToday || undefined}
      data-selected={isSelected || undefined}
      data-disabled={isDisabled || undefined}
      data-unavailable={isUnavailable || undefined}
      data-outside-month={isOutsideMonth || undefined}
      onClick={() => {
        if (isInteractive) onSelect(date);
      }}
    >
      <span aria-hidden={isOutsideMonth || undefined}>{date.day}</span>
    </button>
  );
}

/**
 * Presentational, accessible month-grid calendar with single-date selection.
 *
 * Replicates react-aria's `useCalendar` behavior: a controlled value, an
 * internal roving `focusedDate`, month navigation, full keyboard support and
 * the ARIA grid pattern (`role="grid"` → `role="row"` → `role="gridcell"`).
 * Controlled only — no react-hook-form.
 * @returns {ReactElement} - Rendered Calendar
 */
export const Calendar = ({
  value,
  onChange,
  focusedValue,
  minValue,
  maxValue,
  isDateUnavailable,
  isDisabled = false,
  locale,
  id,
  className,
  style,
}: CalendarProps): ReactElement => {
  const timeZone = getLocalTimeZone();
  const resolvedLocale =
    locale ??
    ((typeof document !== "undefined" && document.documentElement.lang) ||
      "en-US");

  // Refs to each day button, keyed by ISO date, so we can imperatively move
  // focus (roving tabindex) after a keyboard navigation.
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Internal focused date, seeded from value → focusedValue → today, clamped
  // into range. The visible month always follows this date.
  const [focusedDate, setFocusedDate] = useState<CalendarDate>(() =>
    constrainValue(
      value ?? focusedValue ?? today(timeZone),
      minValue,
      maxValue,
    ),
  );

  // Whether focus currently lives inside the grid — gates the imperative
  // `.focus()` so navigation only steals focus once the user is already in.
  const isFocusWithinGrid = useRef(false);

  // Follow an externally-changed controlled value into view: when the parent
  // sets a value whose month isn't the one on screen, bring it into the grid.
  // Same-month selection (clicks / keyboard) leaves the focus untouched, so
  // this never fights user navigation. Mirrors react-aria's behavior.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed on `value` only; refs and setters are stable.
  useEffect(() => {
    if (value && !isSameMonth(value, focusedDate)) {
      setFocusedDate(constrainValue(value, minValue, maxValue));
    }
  }, [value]);

  const setCellRef = useCallback(
    (key: string) => (node: HTMLButtonElement | null) => {
      if (node) cellRefs.current.set(key, node);
      else cellRefs.current.delete(key);
    },
    [],
  );

  const focusCell = useCallback((date: CalendarDate) => {
    const node = cellRefs.current.get(date.toString());
    if (node) node.focus();
  }, []);

  /** Move the roving focus to `date` (clamped), focusing its cell if needed. */
  const moveFocus = useCallback(
    (date: CalendarDate) => {
      setFocusedDate(constrainValue(date, minValue, maxValue));
    },
    [minValue, maxValue],
  );

  // Move DOM focus to the focused cell *after* the grid commits, so the target
  // cell exists even when navigation crosses into a new month (a rAF can fire
  // before the new month's cells render). Gated on `isFocusWithinGrid` so it
  // only steals focus once the user is already navigating inside the grid.
  useEffect(() => {
    if (isFocusWithinGrid.current) focusCell(focusedDate);
  }, [focusedDate, focusCell]);

  const selectDate = useCallback(
    (date: CalendarDate) => {
      if (isDisabled) return;
      if (isDateDisabled(date, minValue, maxValue)) return;
      if (isDateUnavailable?.(date)) return;
      onChange(date);
      setFocusedDate(date);
    },
    [isDisabled, minValue, maxValue, isDateUnavailable, onChange],
  );

  const grid = useMemo(
    () => getCalendarGrid(focusedDate, resolvedLocale),
    [focusedDate, resolvedLocale],
  );
  const weekDays = useMemo(
    () => getWeekDays(resolvedLocale, timeZone),
    [resolvedLocale, timeZone],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        month: "long",
        year: "numeric",
      }).format(focusedDate.toDate(timeZone)),
    [resolvedLocale, focusedDate, timeZone],
  );

  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolvedLocale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [resolvedLocale],
  );

  const todayDate = useMemo(() => today(timeZone), [timeZone]);

  // Disable a nav arrow when the entire previous/next month lies outside range.
  const prevMonthEnd = endOfMonth(focusedDate.subtract({ months: 1 }));
  const nextMonthStart = startOfMonth(focusedDate.add({ months: 1 }));
  const isPrevDisabled =
    isDisabled ||
    (minValue !== undefined && prevMonthEnd.compare(minValue) < 0);
  const isNextDisabled =
    isDisabled ||
    (maxValue !== undefined && nextMonthStart.compare(maxValue) > 0);

  const goToPreviousMonth = useCallback(() => {
    setFocusedDate((prev) =>
      constrainValue(prev.subtract({ months: 1 }), minValue, maxValue),
    );
  }, [minValue, maxValue]);

  const goToNextMonth = useCallback(() => {
    setFocusedDate((prev) =>
      constrainValue(prev.add({ months: 1 }), minValue, maxValue),
    );
  }, [minValue, maxValue]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (isDisabled) return;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          moveFocus(focusedDate.subtract({ days: 1 }));
          break;
        case "ArrowRight":
          event.preventDefault();
          moveFocus(focusedDate.add({ days: 1 }));
          break;
        case "ArrowUp":
          event.preventDefault();
          moveFocus(focusedDate.subtract({ weeks: 1 }));
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocus(focusedDate.add({ weeks: 1 }));
          break;
        case "PageUp":
          event.preventDefault();
          moveFocus(focusedDate.subtract({ months: 1 }));
          break;
        case "PageDown":
          event.preventDefault();
          moveFocus(focusedDate.add({ months: 1 }));
          break;
        // Home/End jump to the first/last day of the focused month (documented
        // simplification of react-aria's start/end-of-week default).
        case "Home":
          event.preventDefault();
          moveFocus(startOfMonth(focusedDate));
          break;
        case "End":
          event.preventDefault();
          moveFocus(endOfMonth(focusedDate));
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          selectDate(focusedDate);
          break;
        default:
          break;
      }
    },
    [isDisabled, focusedDate, moveFocus, selectDate],
  );

  return (
    <div
      id={id}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      data-disabled={isDisabled || undefined}
    >
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav-button"
          aria-label="Previous month"
          disabled={isPrevDisabled}
          onClick={goToPreviousMonth}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <h2 className="calendar-title" aria-live="polite">
          {monthLabel}
        </h2>
        <button
          type="button"
          className="calendar-nav-button"
          aria-label="Next month"
          disabled={isNextDisabled}
          onClick={goToNextMonth}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: the ARIA grid pattern requires role="grid"; no native element provides composite-grid keyboard semantics, and roving tabindex on the descendant gridcell buttons handles focus. */}
      <div
        role="grid"
        aria-label={monthLabel}
        className="calendar-grid"
        onKeyDown={handleKeyDown}
        onFocus={() => {
          isFocusWithinGrid.current = true;
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            isFocusWithinGrid.current = false;
          }
        }}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid header row. */}
        {/* biome-ignore lint/a11y/useFocusableInteractive: header row is presentational; roving focus lives on the gridcell buttons. */}
        <div role="row" className="calendar-weekdays">
          {weekDays.map((label) => (
            // biome-ignore lint/a11y/useSemanticElements: ARIA grid columnheader.
            // biome-ignore lint/a11y/useFocusableInteractive: column headers are not focusable in the grid pattern.
            <div
              key={label}
              role="columnheader"
              aria-label={label}
              className="calendar-weekday"
            >
              <span aria-hidden="true">{label}</span>
            </div>
          ))}
        </div>

        {grid.map((week) => (
          // biome-ignore lint/a11y/useSemanticElements: ARIA grid week row.
          // biome-ignore lint/a11y/useFocusableInteractive: rows are not focusable; roving focus lives on the gridcell buttons.
          <div key={week[0].toString()} role="row" className="calendar-week">
            {week.map((date) => {
              const outside = !isSameMonth(date, focusedDate);
              const disabled =
                isDisabled || isDateDisabled(date, minValue, maxValue);
              const unavailable = !disabled && !!isDateUnavailable?.(date);
              return (
                <CalendarCell
                  key={date.toString()}
                  date={date}
                  isOutsideMonth={outside}
                  isSelected={!outside && !!value && isSameDay(date, value)}
                  isToday={isSameDay(date, todayDate)}
                  isDisabled={disabled}
                  isUnavailable={unavailable}
                  isFocused={!outside && isSameDay(date, focusedDate)}
                  fullDateLabel={fullDateFormatter.format(
                    date.toDate(timeZone),
                  )}
                  onSelect={selectDate}
                  cellRef={setCellRef(date.toString())}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
