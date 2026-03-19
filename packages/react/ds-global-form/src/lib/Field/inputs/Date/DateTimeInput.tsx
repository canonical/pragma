import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import type { DateTimeInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input datetime chrome";

/**
 * Native datetime-local input with form-input chrome.
 * @returns {React.ReactElement} - Rendered DateTimeInput
 */
const DateTimeInput = ({
  id,
  className,
  style,
  name,
  min,
  max,
  step,
  registerProps,
  ...otherProps
}: DateTimeInputProps): React.ReactElement => {
  const { register } = useFormContext();
  return (
    <input
      id={id}
      style={style}
      type="datetime-local"
      min={min}
      max={max}
      step={step}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...otherProps}
      {...register(name, registerProps)}
    />
  );
};

export default withWrapper<DateTimeInputProps>(DateTimeInput);
