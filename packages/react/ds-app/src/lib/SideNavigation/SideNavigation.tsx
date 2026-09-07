import type React from "react";
import { useCallback, useId, useState } from "react";
import { useCollapseShortcut } from "./common/hooks/useCollapseShortcut/index.js";
import {
  CollapseToggle,
  Content,
  ContextSwitcher,
  Footer,
  Group,
  GroupHeader,
  Header,
  Item,
  ItemButton,
  ItemExpandable,
  ItemSwitch,
  Secondary,
  Separator,
} from "./common/index.js";
import type { SideNavigationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation";

/**
 * SideNavigation — full-height application navigation rendered from a WD405
 * Item tree. Owns its expand/collapse (rail) state — uncontrolled, seeded by
 * `defaultExpanded` — and wires the header's collapse toggle to the content
 * region it controls. Collapsed, the rail narrows to the logo and shows no
 * navigation items at all (SPEC.md §1.2, §7) — only the header and footer.
 *
 * Renders as a self-contained `<nav>` landmark (SPEC.md §1, §6); `aria-label`
 * defaults to `"Main navigation"` and may be overridden by the consumer.
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
  applicationName,
  root,
  footerRoot,
  footerItems,
  certificateUser = false,
  LinkComponent = "a",
  currentUrl,
  // Controlled circuit — not official yet.
  // expanded: expandedProp,
  defaultExpanded = true,
  // onExpandedChange,
  keyboardShortcut = true,
  "aria-label": ariaLabel,
  children,
  ...props
}: SideNavigationProps): React.ReactElement => {
  const contentId = useId();

  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  // Reserved (§10.1) — inert until a consumer opts in via `keyboardShortcut`,
  // which defaults to `false`. See common/hooks/useCollapseShortcut.
  useCollapseShortcut({ enabled: keyboardShortcut, onTrigger: handleToggle });

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
    <nav
      className={[componentCssClassName, !expanded && "collapsed", className]
        .filter(Boolean)
        .join(" ")}
      data-expanded={expanded}
      {...props}
      aria-label={ariaLabel ?? "Main navigation"}
    >
      <Header
        brand={brand}
        applicationName={applicationName}
        expanded={expanded}
        onToggle={handleToggle}
        collapseControls={contentId}
      />
      <Content
        id={contentId}
        root={root}
        LinkComponent={LinkComponent}
        currentUrl={currentUrl}
      >
        {children}
      </Content>
      {(footerItems && footerItems.length > 0) || footerRoot ? (
        <Footer
          root={footerRoot}
          items={footerItems}
          certificateUser={certificateUser}
          LinkComponent={LinkComponent}
          currentUrl={currentUrl}
        />
      ) : null}
    </nav>
  );
};

SideNavigation.CollapseToggle = CollapseToggle;
SideNavigation.Content = Content;
SideNavigation.ContextSwitcher = ContextSwitcher;
SideNavigation.Footer = Footer;
SideNavigation.Group = Group;
SideNavigation.GroupHeader = GroupHeader;
SideNavigation.Header = Header;
SideNavigation.Item = Item;
SideNavigation.ItemButton = ItemButton;
SideNavigation.ItemExpandable = ItemExpandable;
SideNavigation.ItemSwitch = ItemSwitch;
SideNavigation.Secondary = Secondary;
SideNavigation.Separator = Separator;

export default SideNavigation;
