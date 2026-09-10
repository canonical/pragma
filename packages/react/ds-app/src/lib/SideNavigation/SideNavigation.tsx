import type React from "react";
import { useCallback, useEffect, useId, useState } from "react";
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
 * and non-navigational actions). The root element is a plain `<div>` and
 * the component's single *navigation* landmark is Content's `<nav>`, so
 * screen readers announce exactly one navigation region; the regions
 * themselves are `<header>`/`<footer>` elements, which additionally
 * expose banner/contentinfo landmarks. `aria-label` is forwarded to the
 * `<nav>` and defaults to `"Main navigation"`.
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
  defaultExpanded: defaultExpandedProp,
  // onExpandedChange,
  keyboardShortcut = false,
  "aria-label": ariaLabel,
  ...props
}: SideNavigationProps): React.ReactElement => {
  const contentId = useId();

  const [expanded, setExpanded] = useState(defaultExpandedProp ?? true);

  // Mobile seed (SPEC.md §4 responsive): below the small breakpoint, the
  // expanded state renders as a fullscreen fixed overlay — a takeover, not a
  // rail — so with `defaultExpanded` left unset (desktop default `true`), a
  // small viewport collapses the rail after mount instead. An explicit
  // `defaultExpanded` always wins, on every viewport. Post-mount on purpose:
  // the server cannot know the viewport, so SSR/hydration stay pure — the
  // cost is one frame of the expanded rail on a phone before the flip.
  useEffect(() => {
    if (defaultExpandedProp !== undefined) return;
    if (window.matchMedia("(width < 620px)").matches) setExpanded(false);
  }, [defaultExpandedProp]);

  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  // Reserved (the 24.04 spec §10.1) — inert until a consumer opts in via
  // `keyboardShortcut`, which defaults to `false`. See
  // common/hooks/useCollapseShortcut.
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
      {/* Skip navigation (first in DOM order): visually hidden until focused,
          then it lets keyboard users jump past the whole navigation block. */}
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
        // Own region, between Header and Content, in a plain <div>: a
        // select-like widget is not navigation, so it sits outside the
        // <nav> landmark. Hidden when collapsed — its rows are label-driven
        // and unviable icon-only (the collapsed CSS hides the region via
        // the root's data-expanded, so the region carries no state of its
        // own).
        <div className="ds side-navigation-context-switcher-region">
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
