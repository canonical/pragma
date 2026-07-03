import { forwardRef, type ReactElement } from "react";
import type { RangeInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds range";

/**
 * Presentational range input with a live value `<output>` — pure markup, no
 * react-hook-form. The `value` prop drives the output display; the field tier
 * injects it via `bindField(..., { injectValue: true })`. The `<input>` itself
 * stays uncontrolled (driven by register / the consumer).
 * @returns {ReactElement} - Rendered Range
 *
 * `import { RangeInput } from "@canonical/react-ds-global-form";`
 */
export const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(
  function RangeInput(
    { id, className, style, min, max, value, ...nativeProps },
    ref,
  ): ReactElement {
    return (
      <>
        <input
          id={id}
          type="range"
          className={[componentCssClassName, className]
            .filter(Boolean)
            .join(" ")}
          style={style}
          aria-valuemin={min}
          aria-valuemax={max}
          min={min}
          max={max}
          ref={ref}
          {...nativeProps}
        />
        <output htmlFor={id} className="ds range-output p">
          {value}
        </output>
      </>
    );
  },
);

export default RangeInput;
