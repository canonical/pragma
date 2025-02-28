/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { CheckboxProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds checkbox";

/**
 * description of the Checkbox component
 * @returns {React.ReactElement} - Rendered Checkbox
 */
const Checkbox = ({
  id,
  children,
  className,
  style,
}: CheckboxProps): React.ReactElement => {
  return (
    <input
      id={id}
      style={style}
      type="checkbox"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    />
  );
};

export default Checkbox;
