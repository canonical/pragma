import { getLocalTimeZone, today } from "@internationalized/date";
import {
  forwardRef,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { Calendar } from "./Calendar.js";
import { DateField } from "./DateField.js";
import type { DatePickerPresentationProps } from "./types.js";
import { parseISO, toISO } from "./utils.js";
import "./DatePicker.css";

const componentCssClassName = "ds date-picker";

/**
 * Presentational date picker — a segmented DateField plus a Calendar in a
 * popover. Controlled by an ISO-8601 string ("YYYY-MM-DD"), so it binds to
 * react-hook-form and submits natively. No react-hook-form dependency here.
 *
 * Reuses the native popover + CSS anchor-positioning pattern used by Combobox
 * and Color.
 * @returns {ReactElement} - Rendered DatePicker
 */
export const DatePicker = forwardRef<
  HTMLDivElement,
  DatePickerPresentationProps
>(function DatePicker(
  {
    id,
    className,
    style,
    value,
    onChange,
    onBlur,
    minValue,
    maxValue,
    isDisabled = false,
    isDateUnavailable,
    locale,
    ...aria
  },
  ref,
): ReactElement {
  const calendarDate = parseISO(value);
  const min = parseISO(minValue) ?? undefined;
  const max = parseISO(maxValue) ?? undefined;

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Mirror the Combobox/Color popover handling: manual popover + effect.
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    try {
      if (isOpen) {
        el.showPopover();
      } else {
        el.hidePopover();
      }
    } catch {
      // popover API unsupported or already in the target state
    }
  }, [isOpen]);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const el = popoverRef.current;
      const root = (e.target as Node)?.getRootNode?.();
      if (el && !el.contains(e.target as Node) && root) {
        // Only close if the click is outside both the popover and the control.
        setIsOpen(false);
      }
    };
    const id = requestAnimationFrame(() =>
      document.addEventListener("click", handleClick),
    );
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("click", handleClick);
    };
  }, [isOpen]);

  return (
    <div
      id={id}
      ref={ref}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <div className="ds input chrome date-picker-control">
        <DateField
          className="date-picker-field"
          value={calendarDate}
          onChange={(d) => onChange?.(toISO(d))}
          onBlur={onBlur}
          minValue={min}
          maxValue={max}
          isDisabled={isDisabled}
          locale={locale}
          {...aria}
        />
        <button
          type="button"
          className="date-picker-toggle"
          aria-label="Show calendar"
          aria-expanded={isOpen}
          disabled={isDisabled}
          onClick={() => setIsOpen((o) => !o)}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <rect x="2" y="3" width="12" height="11" rx="1" />
            <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
          </svg>
        </button>
      </div>

      <div ref={popoverRef} popover="manual" className="ds date-picker-popover">
        {isOpen && (
          <Calendar
            value={calendarDate}
            onChange={(d) => {
              onChange?.(toISO(d));
              setIsOpen(false);
            }}
            focusedValue={calendarDate ?? today(getLocalTimeZone())}
            minValue={min}
            maxValue={max}
            isDateUnavailable={isDateUnavailable}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
});

export default DatePicker;
