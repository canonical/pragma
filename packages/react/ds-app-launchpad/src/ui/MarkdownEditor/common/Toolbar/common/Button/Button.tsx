/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { useId } from "react";
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
  const id = useId();

  const tooltipMessage = shortcut ? `${label} (${shortcut})` : label;
  const tooltipId = `${id}-tooltip`;

  return (
    <>
      <button
        id={id}
        style={style}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
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
