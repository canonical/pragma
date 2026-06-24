import { forwardRef, type ReactElement } from "react";
import type { TimeInputPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input time chrome";

/**
 * Presentational time input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 * @returns {ReactElement} - Rendered TimeInput
 */
export const TimeInput = forwardRef<
  HTMLInputElement,
  TimeInputPresentationProps
>(function TimeInput(
  { id, className, style, min, max, step, ...nativeProps },
  ref,
): ReactElement {
  return (
    <input
      id={id}
      style={style}
      type="time"
      min={min}
      max={max}
      step={step}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      ref={ref}
      {...nativeProps}
    />
  );
});

export default TimeInput;
