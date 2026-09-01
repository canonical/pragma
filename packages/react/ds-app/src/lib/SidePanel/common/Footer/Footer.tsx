import type React from "react";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel-footer";

/**
 * Footer for SidePanel. Never scrolls: it stays visible while
 * `SidePanel.Content` scrolls above it, so its actions are always reachable.
 */
const Footer = ({
  children,
  className,
  ...props
}: FooterProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
};

Footer.displayName = "SidePanel.Footer";

export default Footer;
