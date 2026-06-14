import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import {
  forwardRef,
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DateFieldProps } from "./types.js";
import "./DateField.css";

const componentCssClassName = "ds date-field";

/** Editable segment kinds, in no particular order (order is locale-derived). */
type SegmentType = "month" | "day" | "year";

/** One rendered token: either an editable segment or a literal separator. */
type Token =
  | { kind: "segment"; type: SegmentType }
  | { kind: "literal"; value: string };

/** Per-segment local entry state; null means "placeholder / unset". */
type Segments = Record<SegmentType, number | null>;

const PLACEHOLDERS: Record<SegmentType, string> = {
  month: "mm",
  day: "dd",
  year: "yyyy",
};

const ARIA_LABELS: Record<SegmentType, string> = {
  month: "Month",
  day: "Day",
  year: "Year",
};

const STATIC_MIN: Record<SegmentType, number> = { month: 1, day: 1, year: 1 };
const STATIC_MAX: Record<SegmentType, number> = {
  month: 12,
  day: 31,
  year: 9999,
};

/** Digit count at which a segment is "full" and focus should auto-advance. */
const MAX_DIGITS: Record<SegmentType, number> = { month: 2, day: 2, year: 4 };

/** Number of days in the given month/year (calendar-aware via clamp). */
function daysInMonth(year: number, month: number): number {
  // `.set({ day: 100 })` clamps to the last valid day of the month, honoring
  // leap years and the calendar system.
  return new CalendarDate(year, month, 1).set({ day: 100 }).day;
}

/** Build the token list (segment order + literal separators) from the locale. */
function buildTokens(locale: string): Token[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // A concrete reference date is required to format parts.
  const reference = new Date(2020, 0, 2);
  const tokens: Token[] = [];
  for (const part of formatter.formatToParts(reference)) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      tokens.push({ kind: "segment", type: part.type });
    } else if (part.type === "literal") {
      tokens.push({ kind: "literal", value: part.value });
    }
  }
  // Fallback to the en-US order if the locale produced no segments.
  if (!tokens.some((t) => t.kind === "segment")) {
    return [
      { kind: "segment", type: "month" },
      { kind: "literal", value: "/" },
      { kind: "segment", type: "day" },
      { kind: "literal", value: "/" },
      { kind: "segment", type: "year" },
    ];
  }
  return tokens;
}

/** Extract the editable segment order from the token list. */
function segmentOrder(tokens: Token[]): SegmentType[] {
  return tokens
    .filter(
      (t): t is { kind: "segment"; type: SegmentType } => t.kind === "segment",
    )
    .map((t) => t.type);
}

/** Derive segment state from a CalendarDate value (or all-null when unset). */
function segmentsFromValue(value: CalendarDate | null): Segments {
  if (!value) return { month: null, day: null, year: null };
  return { month: value.month, day: value.day, year: value.year };
}

/** True when every segment is filled. */
function isComplete(
  segments: Segments,
): segments is Record<SegmentType, number> {
  return (
    segments.month !== null && segments.day !== null && segments.year !== null
  );
}

/**
 * Presentational segmented date field — replicates react-aria's
 * useDateField/useDateSegment behavior with month/day/year spinbutton segments.
 * Controlled by an @internationalized/date `CalendarDate`; no react-hook-form.
 * @returns {ReactElement} - Rendered DateField
 */
export const DateField = forwardRef<HTMLDivElement, DateFieldProps>(
  function DateField(
    {
      value,
      onChange,
      onBlur,
      minValue,
      maxValue,
      isDisabled = false,
      locale,
      id,
      className,
      style,
      ...ariaProps
    },
    ref,
  ): ReactElement {
    const resolvedLocale = useMemo(
      () =>
        locale ??
        ((typeof document !== "undefined" && document.documentElement.lang) ||
          "en-US"),
      [locale],
    );

    const tokens = useMemo(() => buildTokens(resolvedLocale), [resolvedLocale]);
    const order = useMemo(() => segmentOrder(tokens), [tokens]);

    // Local per-segment entry state, seeded from the controlled value.
    const [segments, setSegments] = useState<Segments>(() =>
      segmentsFromValue(value),
    );

    // Track the last value we emitted so we don't clobber in-progress typing
    // when our own onChange round-trips back through the `value` prop.
    const lastEmitted = useRef<string | null>(value ? value.toString() : null);

    // Sync segments when the controlled value changes from the outside.
    useEffect(() => {
      const incoming = value ? value.toString() : null;
      if (incoming !== lastEmitted.current) {
        lastEmitted.current = incoming;
        setSegments(segmentsFromValue(value));
      }
    }, [value]);

    // Refs to each editable segment element for focus management.
    const segmentRefs = useRef<Partial<Record<SegmentType, HTMLDivElement>>>(
      {},
    );
    const setSegmentRef = useCallback(
      (type: SegmentType) => (el: HTMLDivElement | null) => {
        if (el) segmentRefs.current[type] = el;
        else delete segmentRefs.current[type];
      },
      [],
    );

    /** Max for a segment given currently-known sibling segments. */
    const maxFor = useCallback(
      (type: SegmentType, current: Segments): number => {
        if (type === "day") {
          const y = current.year ?? 2000; // a leap year, so day 29 is reachable
          const m = current.month ?? 1;
          // When the month is unknown, allow up to 31; once known, clamp.
          return current.month !== null ? daysInMonth(y, m) : STATIC_MAX.day;
        }
        return STATIC_MAX[type];
      },
      [],
    );

    /** Clamp a complete date into [minValue, maxValue] if provided. */
    const clampDate = useCallback(
      (date: CalendarDate): CalendarDate => {
        let next = date;
        if (minValue && next.compare(minValue) < 0) next = minValue;
        if (maxValue && next.compare(maxValue) > 0) next = maxValue;
        return next;
      },
      [minValue, maxValue],
    );

    /**
     * Commit local segment state to the controlled value: emit a CalendarDate
     * when complete (clamped), or null when any segment was cleared.
     */
    const commit = useCallback(
      (next: Segments) => {
        if (isComplete(next)) {
          // Guard the day against the (possibly newly-known) month length.
          const dayMax = daysInMonth(next.year, next.month);
          const day = Math.min(next.day, dayMax);
          const date = clampDate(new CalendarDate(next.year, next.month, day));
          lastEmitted.current = date.toString();
          // Reflect any clamping back into the visible segments.
          setSegments({ month: date.month, day: date.day, year: date.year });
          onChange(date);
        } else {
          lastEmitted.current = null;
          onChange(null);
        }
      },
      [clampDate, onChange],
    );

    const focusSegment = useCallback((type: SegmentType | undefined) => {
      if (type) segmentRefs.current[type]?.focus();
    }, []);

    const adjacent = useCallback(
      (type: SegmentType, dir: 1 | -1): SegmentType | undefined => {
        const idx = order.indexOf(type);
        return order[idx + dir];
      },
      [order],
    );

    /** ArrowUp/ArrowDown: cycle this segment with wraparound. */
    const cycleSegment = useCallback(
      (type: SegmentType, delta: 1 | -1) => {
        setSegments((prev) => {
          let nextVal: number;
          if (isComplete(prev)) {
            // Use @internationalized/date's calendar-aware cycle.
            const date = new CalendarDate(prev.year, prev.month, prev.day);
            const cycled = date.cycle(type, delta);
            const next = {
              month: cycled.month,
              day: cycled.day,
              year: cycled.year,
            };
            commit(next);
            return next;
          }
          // No full date yet — cycle within the segment's own range.
          const min = STATIC_MIN[type];
          const max = maxFor(type, prev);
          const span = max - min + 1;
          const cur = prev[type];
          if (cur === null) {
            // First press: ArrowUp starts at min, ArrowDown starts at max.
            nextVal = delta > 0 ? min : max;
          } else {
            nextVal = ((cur - min + delta + span) % span) + min;
          }
          const next = { ...prev, [type]: nextVal };
          commit(next);
          return next;
        });
      },
      [commit, maxFor],
    );

    /** Set a segment to a concrete value (from typing), then maybe commit. */
    const setSegmentValue = useCallback(
      (type: SegmentType, val: number | null) => {
        setSegments((prev) => {
          const next = { ...prev, [type]: val };
          commit(next);
          return next;
        });
      },
      [commit],
    );

    // Per-segment in-progress digit buffer (for multi-digit entry and the
    // auto-advance decision), keyed by segment. Reset when focus moves.
    const typeBuffer = useRef<Partial<Record<SegmentType, string>>>({});

    const handleKeyDown = useCallback(
      (type: SegmentType) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (isDisabled) return;
        const key = event.key;

        switch (key) {
          case "ArrowUp":
            event.preventDefault();
            typeBuffer.current[type] = undefined;
            cycleSegment(type, 1);
            return;
          case "ArrowDown":
            event.preventDefault();
            typeBuffer.current[type] = undefined;
            cycleSegment(type, -1);
            return;
          case "ArrowLeft":
            event.preventDefault();
            focusSegment(adjacent(type, -1));
            return;
          case "ArrowRight":
            event.preventDefault();
            focusSegment(adjacent(type, 1));
            return;
          case "Home":
            event.preventDefault();
            focusSegment(order[0]);
            return;
          case "End":
            event.preventDefault();
            focusSegment(order[order.length - 1]);
            return;
          case "Backspace": {
            event.preventDefault();
            const buf = typeBuffer.current[type];
            if (buf && buf.length > 1) {
              // Delete the last typed digit, staying on this segment.
              const trimmed = buf.slice(0, -1);
              typeBuffer.current[type] = trimmed;
              setSegmentValue(type, Number.parseInt(trimmed, 10));
              return;
            }
            typeBuffer.current[type] = undefined;
            if (segments[type] === null) {
              // Already empty — move to the previous segment.
              focusSegment(adjacent(type, -1));
            } else {
              setSegmentValue(type, null);
            }
            return;
          }
          default:
            break;
        }

        // Digit entry.
        if (/^[0-9]$/.test(key)) {
          event.preventDefault();
          const min = STATIC_MIN[type];
          // The entry ceiling is the segment's static max (12 / 31 / 9999); the
          // dynamic month-aware day max is applied at commit/display time so a
          // typed "30" survives keystrokes even in a 28-day month.
          const ceiling = STATIC_MAX[type];
          const max = maxFor(type, segments);
          const prevBuf = typeBuffer.current[type] ?? "";
          const digit = Number.parseInt(key, 10);

          // Compute the candidate numeric value from the accumulated buffer.
          let buf = prevBuf + key;
          let numeric = Number.parseInt(buf, 10);

          // If appending overflows the ceiling, the digit starts a fresh value.
          if (numeric > ceiling) {
            buf = key;
            numeric = digit;
          }
          // Don't allow a stuck leading-zero buffer to exceed the digit cap.
          if (buf.length > MAX_DIGITS[type]) {
            buf = key;
            numeric = digit;
          }

          typeBuffer.current[type] = buf;

          // Clamp into range (a typed value below min — e.g. month 0 — is held
          // until a valid digit lands; we store the raw and let commit guard).
          const clamped = Math.max(min, Math.min(numeric, max));
          setSegmentValue(type, clamped);

          // Auto-advance when the segment can hold no more digits: either the
          // digit cap is reached, or another digit would necessarily overflow
          // the ceiling (e.g. month "2" → any second digit ≥ 20 > 12).
          const full = buf.length >= MAX_DIGITS[type] || numeric * 10 > ceiling;
          if (full) {
            typeBuffer.current[type] = undefined;
            focusSegment(adjacent(type, 1));
          }
          return;
        }

        // Any other (non-digit) key is ignored.
      },
      [
        adjacent,
        cycleSegment,
        focusSegment,
        isDisabled,
        maxFor,
        order,
        segments,
        setSegmentValue,
      ],
    );

    // Reset a segment's typing buffer when it loses focus.
    const handleSegmentBlur = useCallback(
      (type: SegmentType) => () => {
        typeBuffer.current[type] = undefined;
      },
      [],
    );

    // Group blur — fire onBlur only when focus leaves the whole group.
    const handleGroupBlur = useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onBlur?.();
        }
      },
      [onBlur],
    );

    // ── Rendering helpers ────────────────────────────────────────────────
    const monthNameFormatter = useMemo(
      () => new Intl.DateTimeFormat(resolvedLocale, { month: "long" }),
      [resolvedLocale],
    );

    const renderSegment = (type: SegmentType): ReactElement => {
      const val = segments[type];
      const isPlaceholder = val === null;
      const min = STATIC_MIN[type];
      const max = maxFor(type, segments);

      // Display text: zero-padded month/day, raw year; placeholder when unset.
      let display: string;
      if (isPlaceholder) {
        display = PLACEHOLDERS[type];
      } else if (type === "year") {
        display = String(val);
      } else {
        display = String(val).padStart(2, "0");
      }

      // aria-valuetext: month name when known, otherwise the numeric value.
      let valueText: string | undefined;
      if (!isPlaceholder) {
        if (type === "month") {
          // A reference date set to this month yields the localized name.
          const ref = today(getLocalTimeZone()).set({ month: val, day: 1 });
          valueText = monthNameFormatter.format(ref.toDate(getLocalTimeZone()));
        } else {
          valueText = String(val);
        }
      }

      return (
        <div
          key={type}
          ref={setSegmentRef(type)}
          role="spinbutton"
          tabIndex={isDisabled ? -1 : 0}
          className={["segment", isPlaceholder ? "placeholder" : null]
            .filter(Boolean)
            .join(" ")}
          data-placeholder={isPlaceholder ? "true" : undefined}
          data-segment={type}
          aria-label={ARIA_LABELS[type]}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={isPlaceholder ? undefined : val}
          aria-valuetext={valueText}
          aria-disabled={isDisabled ? true : undefined}
          onKeyDown={handleKeyDown(type)}
          onBlur={handleSegmentBlur(type)}
        >
          {display}
        </div>
      );
    };

    return (
      // biome-ignore lint/a11y/useSemanticElements: a role="group" div matches react-aria's date field; a <fieldset> would impose unwanted legend/styling semantics.
      <div
        role="group"
        ref={ref}
        id={id}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        style={style}
        aria-disabled={isDisabled ? true : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        onBlur={handleGroupBlur}
        {...ariaProps}
      >
        {tokens.map((token, i) =>
          token.kind === "segment" ? (
            renderSegment(token.type)
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: literals are static and positional.
            <span key={`lit-${i}`} aria-hidden="true" className="literal">
              {token.value}
            </span>
          ),
        )}
      </div>
    );
  },
);

export default DateField;
