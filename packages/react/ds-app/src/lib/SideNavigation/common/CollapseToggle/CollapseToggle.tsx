import { Icon, withTooltip } from "@canonical/react-ds-global";
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
          (<768px — SPEC.md §7), the icon gives way to a text label reading
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

// Spec: hovering the collapse button for 1s shows a tooltip reading
// "Collapse" or "Expand" depending on state. withTooltip's Message is fixed
// at wrap time — it isn't reactive to the wrapped component's props — so two
// stable wrapped components are built once here (not inside CollapseToggle's
// render: recreating a component type on every render would force React to
// remount it, losing focus/hover state) and CollapseToggle below just picks
// between them.
const CollapseToggleWithCollapseTooltip = withTooltip(
  CollapseToggleButton,
  "Collapse",
  { activateDelay: 1000 },
);
const CollapseToggleWithExpandTooltip = withTooltip(
  CollapseToggleButton,
  "Expand",
  { activateDelay: 1000 },
);

/**
 * SideNavigation.CollapseToggle — icon-only button that expands or collapses
 * the navigation rail. Carries the disclosure ARIA contract: `aria-expanded`
 * reflects the current state and `aria-controls` should point at the id of the
 * navigation region it toggles. Hovering for 1s shows a tooltip naming the
 * action ("Collapse"/"Expand" — SPEC.md §5, §9.4); the `<button>`'s own
 * `aria-label` carries the fuller "Collapse/Expand navigation" text.
 *
 * @implements ds:apps.subcomponent.side-navigation-collapse-toggle
 */
const CollapseToggle = (props: CollapseToggleProps): React.ReactElement => {
  const Wrapped =
    (props.expanded ?? true)
      ? CollapseToggleWithCollapseTooltip
      : CollapseToggleWithExpandTooltip;
  return <Wrapped {...props} />;
};

export default CollapseToggle;
