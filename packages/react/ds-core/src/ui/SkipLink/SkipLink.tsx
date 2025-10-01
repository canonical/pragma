/* @canonical/generator-ds 0.10.0-experimental.4 */

import type React from "react";
import type { SkipLinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds skip-link";

/**
 * A component that allows users to skip to the main content of a page.
 * @implements syntax:core:component:skiplink:1.0.0
 * @returns {React.ReactElement} - Rendered SkipLink
 */
const SkipLink = ({
  className,
  children,
  mainId = "main",
  ...props
}: SkipLinkProps): React.ReactElement => {
  const href = `#${mainId}`;
  const skipLinkContents = children || "Skip to main content";

  return (
    <a
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      href={href}
      tabIndex={0}
      {...props}
    >
      {skipLinkContents}
    </a>
  );
};

export default SkipLink;
