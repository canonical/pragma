import { forwardRef, type ReactElement } from "react";
import type { DateInputPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input date chrome";

/**
 * Presentational date input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 * @returns {ReactElement} - Rendered DateInput
 */
export const DateInput = forwardRef<
  HTMLInputElement,
  DateInputPresentationProps
>(function DateInput(
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
});

export default DateInput;
