import { forwardRef, type ReactElement } from "react";
import type { DateTimeInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input datetime chrome";

/**
 * Presentational datetime-local input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 *
 * @remarks
 * This is a NATIVE `<input type="datetime-local">`. The **visible** date format
 * and **12/24-hour** clock follow the user's locale/OS and **cannot be forced**
 * — there is no HTML/CSS/JS lever for a native picker. The `value` is always
 * ISO `yyyy-mm-ddTHH:mm`. Controlling the display would require a custom
 * (non-native) control.
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
