/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useFormContext } from "react-hook-form";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import type { TextProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds form-text";

/**
 * description of the Text component
 * @returns {React.ReactElement} - Rendered Text
 */
const Text = ({
  id,
  className,
  style,
  inputType = "text",
  name,
  prefix,
  suffix,
  registerProps,
  ...otherProps // Should only be native input props
}: TextProps): React.ReactElement => {
  const { register } = useFormContext();
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {prefix && <span className="prefix">{prefix}</span>}
      <input
        type={inputType}
        {...otherProps}
        {...register(name, registerProps)}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
};

export type MyComp = typeof Text;

export default withWrapper<TextProps>(Text);
