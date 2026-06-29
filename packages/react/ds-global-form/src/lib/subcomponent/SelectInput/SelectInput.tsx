import { forwardRef, type ReactElement } from "react";
import type { SelectInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input select chrome";

/**
 * Presentational select input — pure markup, no react-hook-form.
 *
 * Usable standalone (controlled via `value`/`onChange`, or uncontrolled) or via
 * the field tier, which spreads react-hook-form's `register()` result onto it.
 * @returns {ReactElement} - Rendered Select
 */
export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  function SelectInput(
    { id, className, style, options, ...nativeProps },
    ref,
  ): ReactElement {
    return (
      <select
        id={id}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        style={style}
        ref={ref}
        {...nativeProps}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  },
);

export default SelectInput;
