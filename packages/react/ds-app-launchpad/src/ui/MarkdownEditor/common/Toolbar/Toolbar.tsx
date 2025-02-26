/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useEffect, useRef } from "react";
import "./styles.css";
import type { ToolbarProps } from "./types.js";

const componentCssClassName = "ds toolbar";

/**
 * A horizontal container that groups related controls in a toolbar.
 */
const Toolbar = ({
  id,
  children,
  className,
  style,
  label,
}: ToolbarProps): React.ReactElement => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to reapply tabindex when children change
  useEffect(() => {
    if (!toolbarRef.current) return;
    const buttons = Array.from(
      toolbarRef.current.querySelectorAll<HTMLButtonElement>("button"),
    );
    for (const button of buttons) {
      button.setAttribute("tabindex", "-1");
    }

    const firstNode = buttons[0];
    firstNode.setAttribute("tabindex", "0");
  }, [children]);

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      aria-label={label}
      role="toolbar"
      aria-orientation="horizontal"
      ref={toolbarRef}
    >
      {children}
    </div>
  );
};

export default Toolbar;
