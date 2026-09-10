import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import { useCallback, useEffect, useId, useState } from "react";
import type { ItemExpandableProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-expandable";

/**
 * SideNavigation.ItemExpandable — a collapsible row that discloses its own
 * (always-leaf) children instead of navigating (SPEC.md §4.3). Native
 * `<details>`/`<summary>` — no `role`/`aria-expanded` authored, per
 * `cs:ui_blocks.nojs.disclosure`. `heading` and `children` are composed,
 * not string props — matching `Accordion.Item`'s own split.
 *
 * Uncontrolled — seeded by `defaultExpanded` (NavTree supplies it from the
 * tree's own state: whether this node's branch is the selected one,
 * SPEC.md §5), mirroring SideNavigation's own rail-collapse state rather
 * than Accordion.Item's externally-controlled circuit; each instance is
 * independent. That seed is live: when it turns `true` on navigation the
 * disclosure re-opens — one-way, so a manual collapse stays collapsed and
 * the disclosure never auto-closes.
 *
 * `collapseOnChildClick` is the Footer's opt-in: activating a leaf row
 * among the `children` collapses the disclosure — the footer's rows are
 * choices, consumed by activating them. The content tree does not opt in:
 * its branch stays open so the active row remains visible.
 *
 * @implements ds:apps.subcomponent.side-navigation-item-expandable
 */
const ItemExpandable = ({
  heading,
  icon,
  disabled = false,
  defaultExpanded = false,
  collapseOnChildClick = false,
  children,
  className,
  ...props
}: ItemExpandableProps): React.ReactElement => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // The seed is mount-only. This one-way sync re-opens the disclosure when
  // its branch becomes active on navigation; a manual collapse stays
  // collapsed and the disclosure never auto-closes.
  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  // Unique per instance and ident-safe (useId may contain ":" on older
  // React). Wires the collapsed-rail popover's CSS anchor positioning: the
  // summary anchors, the panel positions against it, and the browser flips
  // it on overflow (`position-try-fallbacks` in styles.css) — no
  // measurement JS.
  const anchorName = `--sidenav-expandable-${useId().replace(
    /[^a-zA-Z0-9]/g,
    "",
  )}`;

  const handleToggle = useCallback(
    (event: React.SyntheticEvent<HTMLDetailsElement>) => {
      setExpanded(event.currentTarget.open);
    },
    [],
  );

  // Guards the CLICK, not the toggle: the native `toggle` event isn't
  // cancelable, and skipping the React state update wouldn't undo a toggle
  // the browser already applied (nothing forces a corrective re-render).
  // Preventing the summary's default stops the disclosure toggling at all.
  const handleSummaryClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (disabled) event.preventDefault();
    },
    [disabled],
  );

  // Footer opt-in (`collapseOnChildClick`): activating a child link or
  // button row collapses the disclosure (the summary has neither, so it is
  // excluded by the closest() check). Delegated on the list so the row
  // components stay unaware of their disclosure parent.
  const handleChildrenClick = useCallback(
    (event: React.MouseEvent<HTMLUListElement>) => {
      if (
        collapseOnChildClick &&
        (event.target as Element).closest("a, button")
      ) {
        setExpanded(false);
      }
    },
    [collapseOnChildClick],
  );

  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
      {...props}
    >
      <details className="details" open={expanded} onToggle={handleToggle}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: <summary> is the native disclosure trigger for its <details> (implicit button semantics per HTML-AAM); biome's static-element check doesn't recognise it. */}
        <summary
          className="row"
          onClick={handleSummaryClick}
          style={{ anchorName }}
        >
          {/* Start cell is always rendered (empty when no icon), matching
              Item, so content stays aligned whether or not a row has an icon. */}
          <span className="start">
            {icon ? <Icon width={16} height={16} icon={icon} /> : null}
          </span>
          {/* `title` — native tooltip fallback for truncated text; SPEC.md §10.17. */}
          <span
            className="label"
            title={typeof heading === "string" ? heading : undefined}
          >
            {heading}
          </span>
          <Icon icon="chevron-down" className="end caret" />
        </summary>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: delegated listener only;
            keyboard users activate the rows' own <a>/<button> elements, and
            that synthetic click bubbles here — no ul-level key handler. */}
        <ul
          className="children"
          onClick={handleChildrenClick}
          style={{ positionAnchor: anchorName }}
        >
          {children}
        </ul>
      </details>
    </li>
  );
};

export default ItemExpandable;
