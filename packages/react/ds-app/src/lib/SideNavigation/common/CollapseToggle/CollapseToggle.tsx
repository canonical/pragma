import { Icon, TooltipEngine } from "@canonical/react-ds-global";
import type React from "react";
import type { CollapseToggleProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds collapse-toggle";

const CollapseToggleButton = ({
  className,
  expanded = true,
  "aria-label": ariaLabel,
  ...props
}: CollapseToggleProps): React.ReactElement => {
  return (
    <button
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      aria-expanded={expanded}
      aria-label={
        ariaLabel ?? (expanded ? "Collapse navigation" : "Expand navigation")
      }
      {...props}
      type="button"
    >
      {/* Desktop: an icon (SPEC.md §5, §9). Below the spec's small breakpoint
          (<620px — SPEC.md §7), the icon gives way to a text label reading
          "Menu"/"Close menu" instead — the two are simple CSS-toggled
          siblings (see styles.css) rather than a media-query read in JS, so
          this needs no client-only branch and stays SSR-identical. */}
      <Icon
        icon={expanded ? "collapse-side-nav" : "expand-side-nav"}
        className="desktop-only"
      />
      <span className="mobile-only p">{expanded ? "Close menu" : "Menu"}</span>
    </button>
  );
};

/**
 * SideNavigation.CollapseToggle — icon-only button that expands or collapses
 * the navigation rail. Carries the disclosure ARIA contract: `aria-expanded`
 * reflects the current state and `aria-controls` should point at the id of the
 * navigation region it toggles. Hovering for 1s shows a tooltip naming the
 * action ("Collapse"/"Expand" — SPEC.md §5, §9.4); the `<button>`'s own
 * `aria-label` carries the fuller "Collapse/Expand navigation" text.
 *
 * Rendered through `TooltipEngine` (not `withTooltip`) so the tooltip's
 * message follows the `expanded` prop as a live prop: one stable element
 * type across state changes, so the button — and with it keyboard focus
 * and hover state — survives every toggle instead of remounting.
 *
 * @implements ds:apps.subcomponent.side-navigation-collapse-toggle
 */
const CollapseToggle = ({
  expanded = true,
  ...props
}: CollapseToggleProps): React.ReactElement => (
  <TooltipEngine
    Message={expanded ? "Collapse" : "Expand"}
    activateDelay={1000}
  >
    <CollapseToggleButton expanded={expanded} {...props} />
  </TooltipEngine>
);

export default CollapseToggle;
