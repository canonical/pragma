/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { WrapperProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds wrapper";

/**
 * description of the Wrapper component
 * @returns {React.ReactElement} - Rendered Wrapper
 */
const Wrapper = ({
  id,
  children,
  className,
  style,
}: WrapperProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
};

export default Wrapper;
