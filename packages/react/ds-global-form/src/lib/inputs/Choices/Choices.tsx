import type React from "react";
import useOptionAriaProperties from "../common/useOptionAriaProperties.js";
import type { ChoiceOption, ChoicesPresentationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-choices";

type ChoiceOptionItemProps = {
  name: string;
  type: "checkbox" | "radio";
  option: ChoiceOption;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
};

const ChoiceOptionItem = ({
  name,
  type,
  option,
  checked,
  disabled,
  onChange,
}: ChoiceOptionItemProps): React.ReactElement => {
  const ariaProps = useOptionAriaProperties(name, option.value);
  return (
    <div
      className={["choice", disabled && "disabled"].filter(Boolean).join(" ")}
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
      {/* biome-ignore lint/a11y/noLabelWithoutControl : htmlFor provided via ariaProps */}
      <label className="p" {...ariaProps.label}>
        {option.label}
      </label>
    </div>
  );
};

/**
 * Hidden-input fieldset with freely-styled labels (cards, icons, etc.).
 * Controlled and form-agnostic: the selected value(s) flow in via `value` and
 * out via `onChange` (a single value for radios, an array for checkboxes).
 * @returns {React.ReactElement} - Rendered Choices
 */
export const Choices = ({
  id,
  className,
  style,
  name,
  isMultiple = false,
  disabled = false,
  options,
  value,
  onChange,
}: ChoicesPresentationProps): React.ReactElement => {
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
          <ChoiceOptionItem
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

export default Choices;
