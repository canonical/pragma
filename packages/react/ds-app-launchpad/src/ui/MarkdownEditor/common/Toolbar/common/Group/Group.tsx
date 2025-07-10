/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { ToolbarGroupProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds toolbar-group";

/**
 * A container for grouping related controls within a toolbar.
 */
const ToolbarGroup = ({
  id,
  children,
  className,
  style,
  label,
}: ToolbarGroupProps): React.ReactElement => {
  return (
    // biome-ignore lint/a11y/useSemanticElements: This element is a group of controls
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      aria-label={label}
      role="group"
    >
      {children}
    </div>
  );
};

export default ToolbarGroup;
