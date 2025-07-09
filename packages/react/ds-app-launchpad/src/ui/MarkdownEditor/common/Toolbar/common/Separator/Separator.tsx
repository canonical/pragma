/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import "./styles.css";
import type { ToolbarSeparatorProps } from "./types.js";

const componentCssClassName = "ds toolbar-separator";

/**
 * A visual separator between groups of controls in a toolbar.
 */
const ToolbarSeparator = ({
  id,
  className,
  style,
}: ToolbarSeparatorProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    />
  );
};

export default ToolbarSeparator;
