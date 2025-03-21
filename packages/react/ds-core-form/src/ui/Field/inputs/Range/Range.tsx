/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import type { RangeProps } from "./types.js";
import "./styles.css";
import withWrapper from "../../common/Wrapper/withWrapper.js";

const componentCssClassName = "ds range";

/**
 * description of the Range component
 * @returns {React.ReactElement} - Rendered Range
 */
const Range = ({
  id,
  className,
  style,
  name,
  registerProps,
  ...otherProps
}: RangeProps): React.ReactElement => {
  const { register, watch } = useFormContext();
  const value = watch(name);
  return (
    <>
      <input
        id={id}
        type="range"
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        style={style}
        {...otherProps}
        {...register(name, registerProps)}
      />
      <output htmlFor={id} className="ds range-output">
        {value}
      </output>
    </>
  );
};

export default withWrapper<RangeProps>(Range);
