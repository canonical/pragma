/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useCallback, useId, useRef } from "react";
import { Tooltip } from "react-tooltip";
import "./styles.css";
import type { ToolbarButtonProps } from "./types.js";

const componentCssClassName = "ds toolbar-button";

/**
 * An accessible button with tooltip support designed for use in toolbars.
 */
const ToolbarButton = ({
  children,
  className,
  style,
  label,
  shortcut,
  ...buttonProps
}: ToolbarButtonProps): React.ReactElement => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const tooltipMessage = shortcut ? `${label} (${shortcut})` : label;
  const tooltipId = `${id}-tooltip`;

  const findToolbarContainer = useCallback(() => {
    let node = buttonRef.current as HTMLElement | null;
    while (node) {
      node = node.parentElement;
      const isToolbar = node?.getAttribute("role") === "toolbar";
      if (isToolbar) {
        break;
      }
    }
    return node;
  }, [buttonRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      // Move focus to the previous button
      const toolbar = findToolbarContainer();
      const buttons = toolbar?.querySelectorAll("button");
      if (!buttons) {
        return;
      }
      const index = Array.from(buttons).indexOf(
        buttonRef.current as HTMLButtonElement
      );
      const nextButton = buttons[index + (event.key === "ArrowLeft" ? -1 : 1)];
      if (!nextButton) {
        return;
      }
      nextButton.focus();
      nextButton.setAttribute("tabindex", "0");
      buttonRef.current?.setAttribute("tabindex", "-1");
    }
  };

  return (
    <>
      <button
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        ref={buttonRef}
        onKeyDown={handleKeyDown}
        aria-label={label}
        type="button"
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltipMessage}
        data-tooltip-place="bottom"
        {...buttonProps}
      >
        {children}
      </button>
      <Tooltip
        id={tooltipId}
        style={{
          padding: "5px 10px",
          fontSize: "0.75em",
        }}
      />
    </>
  );
};

export default ToolbarButton;
