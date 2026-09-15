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
      {/* Desktop: an icon (the 24.04 spec §5, §9). Below the small
          breakpoint (<620px — the 24.04 spec §7), a text label reading
          "Menu"/"Close menu" replaces it — CSS-toggled siblings (see
          styles.css), no media-query read in JS, so it stays SSR-identical. */}
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
 * action ("Collapse"/"Expand" — the 24.04 spec §5, §9.4); the `<button>`'s own
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
