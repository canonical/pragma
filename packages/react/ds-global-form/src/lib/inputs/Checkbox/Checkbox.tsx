import { forwardRef, type ReactElement } from "react";
import type { CheckboxPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-checkbox";

/**
 * Presentational checkbox input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `checked`/`onChange`, or uncontrolled) or
 * via the field tier, which spreads react-hook-form's `register()` result onto
 * it.
 * @returns {ReactElement} - Rendered Checkbox
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxPresentationProps>(
  function Checkbox(
    { id, className, style, ...nativeProps },
    ref,
  ): ReactElement {
    return (
      <input
        id={id}
        style={style}
        type="checkbox"
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={ref}
        {...nativeProps}
      />
    );
  },
);

export default Checkbox;
