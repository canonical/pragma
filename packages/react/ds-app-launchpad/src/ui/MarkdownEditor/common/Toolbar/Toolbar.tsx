/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useEffect, useRef } from "react";
import {
  ToolbarButton,
  ToolbarGroup,
  ToolbarSeparator,
} from "./common/index.js";
import "./styles.css";
import type { ToolbarComponent } from "./types.js";

const componentCssClassName = "ds toolbar";

/**
 * A horizontal container that groups related controls in a toolbar.
 */
const Toolbar = (({ id, children, className, style, label }) => {
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
    if (firstNode) firstNode.setAttribute("tabindex", "0");
  }, [children]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!toolbarRef.current) return;
    const target = event.target as HTMLButtonElement;
    if (target.tagName !== "BUTTON") return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const buttons = Array.from(
        toolbarRef.current.querySelectorAll<HTMLButtonElement>("button") ?? [],
      );
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const currentIndex = buttons.indexOf(target);
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) nextIndex = buttons.length - 1;
      if (nextIndex >= buttons.length) nextIndex = 0;

      const currentButton = buttons[currentIndex];
      const nextButton = buttons[nextIndex];
      currentButton.setAttribute("tabindex", "-1");
      nextButton.setAttribute("tabindex", "0");
      nextButton.focus();
    }
  };

  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      aria-label={label}
      role="toolbar"
      aria-orientation="horizontal"
      ref={toolbarRef}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}) as ToolbarComponent;

Toolbar.Group = ToolbarGroup;
Toolbar.Button = ToolbarButton;
Toolbar.Separator = ToolbarSeparator;

export default Toolbar;
