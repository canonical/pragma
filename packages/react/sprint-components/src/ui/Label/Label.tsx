/* @canonical/generator-ds 0.9.0-experimental.20 */
import type React from "react";
import type { LabelProps } from "./types.js";

/**
 * description of the Label component
 * @returns {React.ReactElement} - Rendered Label
 */
const Label = ({
  id,
  htmlFor,
  children,
  className,
  style,
}: LabelProps): React.ReactElement => {
  return (
    <label
      id={id}
      htmlFor={htmlFor}
      style={style}
      className={[className].filter(Boolean).join(" ")}
    >
      {children}
    </label>
  );
};

export default Label;
