import { forwardRef, type ReactElement } from "react";
import type { DateInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input date chrome";

/**
 * Presentational date input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 *
 * @remarks
 * This is a NATIVE `<input type="date">`. The **visible** date format
 * (`mm/dd/yyyy` vs `dd/mm/yyyy` vs `yyyy-mm-dd`) follows the user's locale/OS
 * and **cannot be forced** — there is no HTML/CSS/JS lever for a native picker.
 * The `value` is always locale-independent ISO `yyyy-mm-dd`. To control the
 * displayed format you would need a custom (non-native) date control.
 * @returns {ReactElement} - Rendered DateInput
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    { id, className, style, min, max, ...nativeProps },
    ref,
  ): ReactElement {
    return (
      <input
        id={id}
        style={style}
        type="date"
        min={min}
        max={max}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={ref}
        {...nativeProps}
      />
    );
  },
);

export default DateInput;
