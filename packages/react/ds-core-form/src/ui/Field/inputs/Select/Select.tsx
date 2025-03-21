/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import type { SelectProps } from "./types.js";
import "./styles.css";
import withWrapper from "../../common/Wrapper/withWrapper.js";

const componentCssClassName = "ds select";

/**
 * description of the Select component
 * @returns {React.ReactElement} - Rendered Select
 */
const Select = ({
  id,
  className,
  style,
  name,
  registerProps,
  options,
  ...otherProps
}: SelectProps): React.ReactElement => {
  const { register } = useFormContext();
  return (
    <select
      id={id}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={style}
      {...otherProps}
      {...register(name, registerProps)}
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
};

export default withWrapper<SelectProps>(Select);
