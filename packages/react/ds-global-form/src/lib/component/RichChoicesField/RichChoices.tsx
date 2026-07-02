import type React from "react";
import { Option } from "./common/index.js";
import type { RichChoicesPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-rich-choices";

/**
 * Hidden-input fieldset with freely-styled labels (cards, icons, etc.).
 * Controlled and form-agnostic: the selected value(s) flow in via `value` and
 * out via `onChange` (a single value for radios, an array for checkboxes).
 * Each option is rendered by the `Option` subcomponent (common/Option).
 * @returns {React.ReactElement} - Rendered RichChoices
 */
export const RichChoices = ({
  id,
  className,
  style,
  name,
  isMultiple = false,
  disabled = false,
  options,
  value,
  onChange,
}: RichChoicesPresentationProps): React.ReactElement => {
  const type = isMultiple ? "checkbox" : "radio";

  return (
    <fieldset
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
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

export default RichChoices;
