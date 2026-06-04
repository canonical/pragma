import type React from "react";
import { useCallback, useId, useState } from "react";
import { Content, Footer, Header } from "./common/index.js";
import type { SideNavigationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation";

/**
 * SideNavigation — full-height application navigation. Owns its expand/collapse
 * state (uncontrolled, seeded by `defaultExpanded`) and wires the header's
 * collapse toggle to the content region it controls.
 *
 * Only the uncontrolled circuit is official for now. The controlled path
 * (`expanded` + `onExpandedChange`) is wired but commented out below until it's
 * promoted.
 *
 * @implements ds:apps.pattern.side-navigation
 */
const SideNavigation = ({
  className,
  brand,
  children,
  footer,
  // Controlled circuit — not official yet.
  // expanded: expandedProp,
  defaultExpanded = true,
  // onExpandedChange,
  ...props
}: SideNavigationProps): React.ReactElement => {
  const contentId = useId();

  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  // --- Controlled circuit (not official yet) -------------------------------
  // const [uncontrolledExpanded, setUncontrolledExpanded] =
  //   useState(defaultExpanded);
  // const isControlled = expandedProp !== undefined;
  // const expanded = isControlled ? expandedProp : uncontrolledExpanded;
  //
  // const handleToggle = useCallback(() => {
  //   const next = !expanded;
  //   if (!isControlled) setUncontrolledExpanded(next);
  //   onExpandedChange?.(next);
  // }, [expanded, isControlled, onExpandedChange]);
  // -------------------------------------------------------------------------

  return (
    <div
      className={[componentCssClassName, !expanded && "collapsed", className]
        .filter(Boolean)
        .join(" ")}
      data-expanded={expanded}
      {...props}
    >
      <Header
        expanded={expanded}
        onToggle={handleToggle}
        collapseControls={contentId}
      >
        {brand}
      </Header>
      <Content id={contentId}>{children}</Content>
      {footer && <Footer>{footer}</Footer>}
    </div>
  );
};

export default SideNavigation;
