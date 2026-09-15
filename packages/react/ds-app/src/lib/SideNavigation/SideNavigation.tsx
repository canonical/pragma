import type React from "react";
import { useCallback, useId, useState } from "react";
import { useCollapseShortcut } from "./common/hooks/useCollapseShortcut/index.js";
import { Content, ContextSwitcher, Footer, Header } from "./common/index.js";
import type { SideNavigationProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation";

/**
 * SideNavigation — full-height application navigation rendered from a WD405
 * Item tree. Owns its expand/collapse (rail) state — uncontrolled, seeded by
 * `defaultExpanded` — and wires the header's collapse toggle to the content
 * region it controls.
 *
 * Four regions: Header (branding, collapse toggle), the optional
 * ContextSwitcher region (a `role="menu"` select-like widget — not
 * navigation, so it sits outside the landmark in a plain `<div>` between
 * Header and Content; hidden when collapsed, where labels are unviable),
 * Content (the main `<nav>` landmark) and Footer (user profile, settings
 * and non-navigational actions). The root element is a plain `<div>` — the
 * only landmark is the Content `<nav>`, so screen readers announce exactly
 * one navigation region. `aria-label` is forwarded to that `<nav>` and
 * defaults to `"Main navigation"`.
 *
 * A visually hidden "Skip to main content" link is the first element in the
 * component's DOM order, so keyboard users can bypass the navigation block;
 * target it with `skipTo` (default `"#main-content"`).
 *
 * Routing-agnostic: navigable items render via `LinkComponent` (default `"a"`);
 * pass a router `Link` to integrate client-side navigation. The active item is
 * resolved from `currentUrl`.
 *
 * Consumption pattern: data-driven only. Pass props and all four regions
 * build; row-level and region components are private
 * (`cs:react.component.subcomponent_export_api` — no dot-static exports),
 * and render exclusively from data.
 *
 * @implements ds:apps.pattern.side-navigation
 */
const SideNavigation = ({
  className,
  brand,
  applicationName,
  root,
  contextSwitcher,
  footerRoot,
  LinkComponent = "a",
  currentUrl,
  skipTo = "#main-content",
  // Controlled circuit — not official yet.
  // expanded: expandedProp,
  defaultExpanded = true,
  // onExpandedChange,
  keyboardShortcut = false,
  "aria-label": ariaLabel,
  ...props
}: SideNavigationProps): React.ReactElement => {
  const contentId = useId();

  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  // Reserved (§10.1) — inert until `keyboardShortcut` opts in.
  // See common/hooks/useCollapseShortcut.
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
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-expanded={expanded}
      {...props}
    >
      {/* Skip navigation, first in DOM order — visually hidden until focused,
          then jumps keyboard users past the navigation block. */}
      <a className="skip-link" href={skipTo}>
        Skip to main content
      </a>
      <Header
        brand={brand}
        applicationName={applicationName}
        expanded={expanded}
        onToggle={handleToggle}
        collapseControls={contentId}
      />
      {contextSwitcher ? (
        // Own plain <div> region — a select-like widget is not navigation,
        // so it sits outside the <nav> landmark. Hidden when collapsed:
        // its rows are label-driven, unviable icon-only.
        <div
          className="ds side-navigation-context-switcher-region"
          data-expanded={expanded}
        >
          <ContextSwitcher {...contextSwitcher} />
        </div>
      ) : null}
      <Content
        id={contentId}
        root={root}
        LinkComponent={LinkComponent}
        currentUrl={currentUrl}
        aria-label={ariaLabel ?? "Main navigation"}
      />
      {footerRoot ? (
        <Footer
          root={footerRoot}
          LinkComponent={LinkComponent}
          currentUrl={currentUrl}
        />
      ) : null}
    </div>
  );
};

export default SideNavigation;
