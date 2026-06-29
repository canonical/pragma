import { forwardRef, type ReactElement } from "react";
import type { DateTimeInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input datetime chrome";

/**
 * Presentational datetime-local input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 * @returns {ReactElement} - Rendered DateTimeInput
 */
export const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(
  function DateTimeInput(
    { id, className, style, min, max, step, ...nativeProps },
    ref,
  ): ReactElement {
    return (
      <input
        id={id}
        style={style}
        type="datetime-local"
        min={min}
        max={max}
        step={step}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={ref}
        {...nativeProps}
      />
    );
  },
);

export default DateTimeInput;
