import { getLocalTimeZone, today } from "@internationalized/date";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { type RegisterOptions, useController } from "react-hook-form";
import { DateField } from "../../inputs/DatePicker/DateField.js";
import { RangeCalendar } from "../../inputs/DatePicker/RangeCalendar.js";
import { parseISO, toISO } from "../../inputs/DatePicker/utils.js";
import type { DateRangeFieldProps } from "./types.js";
import "./DateRangeField.css";

const componentCssClassName = "ds field date-range-field";

/**
 * Two-field date range bound to react-hook-form. NOT a `Field` router input — it
 * binds two fields (`startName`/`endName`, each an ISO-8601 string) with
 * cross-field validation (end ≥ start), and shares one RangeCalendar popover.
 * @returns {ReactElement} - Rendered DateRangeField
 */
export function DateRangeField({
  id,
  className,
  style,
  startName,
  endName,
  label,
  startLabel = "Start",
  endLabel = "End",
  description,
  minValue,
  maxValue,
  isOptional = false,
  isDisabled = false,
  registerProps,
}: DateRangeFieldProps): ReactElement {
  const uid = useId();
  const labelId = `${uid}-label`;
  const descriptionId = `${uid}-description`;
  const min = parseISO(minValue) ?? undefined;
  const max = parseISO(maxValue) ?? undefined;

  const requiredRule: RegisterOptions = isOptional
    ? {}
    : {
        required: {
          value: true,
          message: `${label || "This field"} is required`,
        },
      };

  const start = useController({
    name: startName,
    rules: { ...registerProps, ...requiredRule },
  });
  const end = useController({
    name: endName,
    rules: {
      ...registerProps,
      ...requiredRule,
      validate: (value: string) => {
        const s = start.field.value as string | undefined;
        if (!s || !value) return true;
        const sd = parseISO(s);
        const ed = parseISO(value);
        if (!sd || !ed) return true;
        return (
          ed.compare(sd) >= 0 || `${endLabel} must be on or after ${startLabel}`
        );
      },
    },
  });

  const startDate = parseISO(start.field.value as string);
  const endDate = parseISO(end.field.value as string);
  const range =
    startDate && endDate ? { start: startDate, end: endDate } : null;

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
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
      // popover API unsupported / already in target state
    }
  }, [isOpen]);

  const error =
    end.fieldState.error?.message ?? start.fieldState.error?.message;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a role="group" div is intentional — a <fieldset> would impose unwanted legend/styling semantics for this two-field composite.
    <div
      id={id}
      style={style}
      role="group"
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      className={[componentCssClassName, error && "danger", className]
        .filter(Boolean)
        .join(" ")}
    >
      {label && (
        <span className="ds field-label" id={labelId}>
          {label}
          {isOptional && <span className="optional"> (optional)</span>}
        </span>
      )}
      <div className="payload">
        {description && (
          <p className="ds field-description" id={descriptionId}>
            {description}
          </p>
        )}

        <div className="date-range-control ds input chrome">
          <DateField
            aria-label={startLabel}
            value={startDate}
            onChange={(d) => start.field.onChange(toISO(d))}
            onBlur={start.field.onBlur}
            minValue={min}
            maxValue={max}
            isDisabled={isDisabled}
          />
          <span aria-hidden="true" className="range-separator">
            –
          </span>
          <DateField
            aria-label={endLabel}
            value={endDate}
            onChange={(d) => end.field.onChange(toISO(d))}
            onBlur={end.field.onBlur}
            minValue={min}
            maxValue={max}
            isDisabled={isDisabled}
          />
          <button
            type="button"
            className="date-range-toggle"
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

        <div
          ref={popoverRef}
          popover="manual"
          className="ds date-range-popover"
        >
          {isOpen && (
            <RangeCalendar
              value={range}
              onChange={(r) => {
                start.field.onChange(toISO(r.start));
                end.field.onChange(toISO(r.end));
                setIsOpen(false);
              }}
              focusedValue={startDate ?? today(getLocalTimeZone())}
              minValue={min}
              maxValue={max}
            />
          )}
        </div>

        {error && (
          <p className="ds field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default DateRangeField;
