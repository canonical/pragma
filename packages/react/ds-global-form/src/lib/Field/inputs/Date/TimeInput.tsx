import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import type { TimeInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input time chrome";

/**
 * Native time input with form-input chrome.
 * @returns {React.ReactElement} - Rendered TimeInput
 */
const TimeInput = ({
  id,
  className,
  style,
  name,
  min,
  max,
  step,
  registerProps,
  ...otherProps
}: TimeInputProps): React.ReactElement => {
  const { register } = useFormContext();
  return (
    <input
      id={id}
      style={style}
      type="time"
      min={min}
      max={max}
      step={step}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...otherProps}
      {...register(name, registerProps)}
    />
  );
};

export default withWrapper<TimeInputProps>(TimeInput);
