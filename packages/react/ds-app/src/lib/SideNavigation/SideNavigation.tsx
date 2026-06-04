import type React from "react";
import { useCallback, useId, useState } from "react";
import { Content, Footer, Header } from "./common/index.js";
import type { SideNavigationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation";

/**
 * SideNavigation — full-height application navigation rendered from a WD405
 * Item tree. Owns its expand/collapse (rail) state — uncontrolled, seeded by
 * `defaultExpanded` — and wires the header's collapse toggle to the content
 * region it controls.
 *
 * Routing-agnostic: navigable items render via `LinkComponent` (default `"a"`);
 * pass a router `Link` to integrate client-side navigation. The active item is
 * resolved from `currentUrl`.
 *
 * @implements ds:apps.pattern.side-navigation
 */
const SideNavigation = ({
  className,
  brand,
  root,
  footerRoot,
  LinkComponent = "a",
  currentUrl,
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
      <Content
        id={contentId}
        root={root}
        LinkComponent={LinkComponent}
        currentUrl={currentUrl}
      />
      {footerRoot && (
        <Footer
          root={footerRoot}
          LinkComponent={LinkComponent}
          currentUrl={currentUrl}
        />
      )}
    </div>
  );
};

export default SideNavigation;
