import { forwardRef, type ReactElement } from "react";
import type { TimeInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input time chrome";

/**
 * Presentational time input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 *
 * @remarks
 * This is a NATIVE `<input type="time">`. Whether the clock shows **12-hour
 * (AM/PM) or 24-hour** follows the user's locale/OS and **cannot be forced** —
 * there is no `hour12`/format lever for a native picker. The `value` is always
 * 24-hour ISO `HH:mm`. Forcing 12/24h would require a custom (non-native) control.
 * @returns {ReactElement} - Rendered TimeInput
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  function TimeInput(
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
  },
);

export default TimeInput;
