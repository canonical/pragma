/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { TextareaProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds textarea";

/**
 * description of the Textarea component
 * @returns {React.ReactElement} - Rendered Textarea
 */
const Textarea = ({
  id,
  children,
  className,
  style,
}: TextareaProps): React.ReactElement => {
  return (
    <textarea
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {children}
    </textarea>
  );
};

export default Textarea;
