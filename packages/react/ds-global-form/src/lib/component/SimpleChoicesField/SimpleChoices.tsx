/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import { Option } from "./common/index.js";
import type { SimpleChoicesPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-simple-choices";

/**
 * Plain-label option group (radios or checkboxes) with inline/stacked layout.
 * Controlled and form-agnostic: the selected value(s) flow in via `value` and
 * out via `onChange` (a single value for radios, an array for checkboxes).
 * Each option is rendered by the `Option` subcomponent (common/Option).
 * @returns {React.ReactElement} - Rendered SimpleChoices
 */
export const SimpleChoices = ({
  id,
  className,
  style,
  name,
  isMultiple = false,
  disabled = false,
  layout = "inline",
  columns,
  options,
  value,
  onChange,
}: SimpleChoicesPresentationProps): React.ReactElement => {
  const type = isMultiple ? "checkbox" : "radio";

  // In the "columns" layout the column count drives a CSS grid; the variable is
  // unused (and so left unset) in the other layouts.
  const layoutStyle =
    layout === "columns" && columns
      ? ({
          ...style,
          "--simple-choices-columns": columns,
        } as React.CSSProperties)
      : style;

  return (
    <fieldset
      id={id}
      style={layoutStyle}
      className={[componentCssClassName, layout, className]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option) => {
        const checked = isMultiple
          ? Array.isArray(value) && value.includes(option.value)
          : value === option.value;
        const handleChange = () => {
          if (isMultiple) {
            const arr = Array.isArray(value) ? value : [];
            onChange?.(
              arr.includes(option.value)
                ? arr.filter((v) => v !== option.value)
                : [...arr, option.value],
            );
          } else {
            onChange?.(option.value);
          }
        };
        return (
          <Option
            key={option.value}
            name={name}
            type={type}
            option={option}
            checked={checked}
            disabled={disabled || Boolean(option.disabled)}
            onChange={handleChange}
          />
        );
      })}
    </fieldset>
  );
};

export default SimpleChoices;
