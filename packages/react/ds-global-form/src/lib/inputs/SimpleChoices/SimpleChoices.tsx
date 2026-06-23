/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import useOptionAriaProperties from "../common/useOptionAriaProperties.js";
import type { Option } from "../types.js";
import type { SimpleChoicesPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-simple-choices";
const optionClassName = "option";

type OptionItemProps = {
  name: string;
  type: "checkbox" | "radio";
  option: Option;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
};

const OptionItem = ({
  name,
  type,
  option,
  checked,
  disabled,
  onChange,
}: OptionItemProps): React.ReactElement => {
  const ariaProps = useOptionAriaProperties(name, option.value);
  return (
    <div
      className={[optionClassName, "grid", disabled && "disabled"]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        name={name}
        value={option.value}
        disabled={disabled}
        type={type}
        checked={checked}
        onChange={onChange}
        {...ariaProps.input}
      />
      {/* biome-ignore lint/a11y/noLabelWithoutControl : is indeed provided but undetected*/}
      <label className="p" {...ariaProps.label}>
        {option.label}
      </label>
    </div>
  );
};

/**
 * Plain-label option group (radios or checkboxes) with inline/stacked layout.
 * Controlled and form-agnostic: the selected value(s) flow in via `value` and
 * out via `onChange` (a single value for radios, an array for checkboxes).
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
  options,
  value,
  onChange,
}: SimpleChoicesPresentationProps): React.ReactElement => {
  const type = isMultiple ? "checkbox" : "radio";

  return (
    <fieldset
      id={id}
      style={style}
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
          <OptionItem
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
