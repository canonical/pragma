/* @canonical/generator-ds 0.10.0-experimental.4 */

import type React from "react";
import { useMemo } from "react";
import type { SkipLinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds skip-link";

/**
 * A component that allows users to skip to the main content of a page.
 * @returns {React.ReactElement} - Rendered SkipLink
 */
const SkipLink = ({
  className,
  children,
  mainId = "main",
  ...props
}: SkipLinkProps): React.ReactElement => {
  const href = useMemo(() => `#${mainId}`, [mainId]);

  const skipLinkContents = useMemo(() => {
    return children || "Skip to main content";
  }, [children]);

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
