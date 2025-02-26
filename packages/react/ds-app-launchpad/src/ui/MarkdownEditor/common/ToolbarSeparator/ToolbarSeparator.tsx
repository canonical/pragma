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
    // biome-ignore lint/a11y/useFocusableInteractive: This element is not interactive
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      role="separator"
      aria-orientation="horizontal"
    />
  );
};

export default ToolbarSeparator;
