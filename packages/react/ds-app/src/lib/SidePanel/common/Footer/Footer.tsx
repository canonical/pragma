import type React from "react";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel-footer";

/**
 * Footer for SidePanel. Never scrolls: it stays visible below
 * `SidePanel.Content`, which scrolls on its own, so its actions are always
 * reachable.
 *
 * @implements ds:apps.subcomponent.side_panel-footer
 */
const Footer = ({
  children,
  className,
  ...props
}: FooterProps): React.ReactElement => {
  // A <div>, not a <footer>: a <footer> inside a <dialog> is exposed as a
  // page-level contentinfo landmark, and the panel is non-modal, so the page's
  // own contentinfo stays reachable beside it and would be duplicated.
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
