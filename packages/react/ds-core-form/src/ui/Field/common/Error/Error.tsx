/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { ErrorProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds error";

/**
 * description of the Error component
 * @returns {React.ReactElement} - Rendered Error
 */
const FieldError = ({
  id,
  children,
  className,
  style,
}: ErrorProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      role="alert"
    >
      {children}
    </div>
  );
};

export default FieldError;
