/* @canonical/generator-ds 0.10.0-experimental.2 */

import type React from "react";
import { useMemo } from "react";
import type { LinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds link";

/**
 * React implementation of the Link (anchor element)
 * @returns {React.ReactElement} - Rendered Link
 * @implements syntax:core:component:link:1.0.0
 */
const Link = ({
  className,
  children,
  appearance: appearanceProp,
  activationContents,
  ...props
}: LinkProps): React.ReactElement => {
  // If hoverContents is provided, the link should be rendered as a soft link
  const appearance = useMemo(
    () => (activationContents ? "soft" : appearanceProp),
    [appearanceProp, activationContents],
  );

  return (
    <a
      className={[componentCssClassName, className, appearance]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
      {activationContents && (
        <span className="activation-contents">{activationContents}</span>
      )}
    </a>
  );
};

export default Link;
