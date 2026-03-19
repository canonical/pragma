import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import type { DateInputProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds input date chrome";

/**
 * Native date input with form-input chrome.
 * @returns {React.ReactElement} - Rendered DateInput
 */
const DateInput = ({
  id,
  className,
  style,
  name,
  min,
  max,
  registerProps,
  ...otherProps
}: DateInputProps): React.ReactElement => {
  const { register } = useFormContext();
  return (
    <input
      id={id}
      style={style}
      type="date"
      min={min}
      max={max}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...otherProps}
      {...register(name, registerProps)}
    />
  );
};

export default withWrapper<DateInputProps>(DateInput);
