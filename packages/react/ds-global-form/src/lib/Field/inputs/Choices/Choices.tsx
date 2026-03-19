import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { useOptionAriaProperties } from "../../hooks/index.js";
import type { ChoiceOptionProps, ChoicesProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-choices";

const ChoiceOption = ({
  name,
  type,
  value,
  label,
  register,
  registerProps,
  disabled,
}: ChoiceOptionProps): React.ReactElement => {
  const ariaProps = useOptionAriaProperties(name, value);
  return (
    <div
      className={["choice", disabled && "disabled"].filter(Boolean).join(" ")}
    >
      <input
        value={value}
        disabled={disabled}
        type={type}
        {...register(name, registerProps)}
        {...ariaProps.input}
      />
      {/* biome-ignore lint/a11y/noLabelWithoutControl : htmlFor provided via ariaProps */}
      <label {...ariaProps.label}>{label}</label>
    </div>
  );
};

/**
 * Hidden-input fieldset with freely-styled labels (cards, icons, etc.).
 * @returns {React.ReactElement} - Rendered Choices
 */
const Choices = ({
  id,
  className,
  style,
  name,
  isMultiple = false,
  disabled = false,
  options,
  columns,
  registerProps,
}: ChoicesProps): React.ReactElement => {
  const { register } = useFormContext();
  const type = isMultiple ? "checkbox" : "radio";

  return (
    <fieldset
      id={id}
      style={
        {
          ...style,
          ...(columns ? { "--choices-columns": columns } : {}),
        } as React.CSSProperties
      }
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {options.map((option) => (
        <ChoiceOption
          key={option.value}
          name={name}
          type={type}
          register={register}
          registerProps={registerProps}
          value={option.value}
          label={option.label}
          disabled={disabled || Boolean(option.disabled)}
        />
      ))}
    </fieldset>
  );
};

export default withWrapper<ChoicesProps>(Choices, { mockLabel: true });
