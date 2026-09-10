import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import { useCallback, useEffect, useId, useState } from "react";
import type { ItemExpandableProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-expandable";

/**
 * SideNavigation.ItemExpandable — a collapsible row that discloses its own
 * (always-leaf) children instead of navigating (the 24.04 spec §4.3). Native
 * `<details>`/`<summary>` — no `role`/`aria-expanded` authored, per
 * `cs:ui_blocks.nojs.disclosure`; the element supplies the disclosure
 * semantics itself, correctly, without scripting. `heading` (the summary's
 * own label) and `children` (what disclosure reveals) are composed, not
 * string props — matching `Accordion.Item`'s own `heading`/`children` split.
 *
 * Uncontrolled — seeded by `defaultExpanded`, mirroring SideNavigation's own
 * rail-collapse state, not Accordion.Item's externally-controlled circuit:
 * each instance is independent (no accordion/single-open behaviour) and
 * NavTree supplies `defaultExpanded` from the tree's own state (whether
 * this node's branch is the selected one — the 24.04 spec §5). That seed is live:
 * when it turns `true` on navigation (a route corresponding to a nested
 * sub-item), the disclosure re-opens — one-way, so a manual collapse stays
 * collapsed and the disclosure never auto-closes.
 *
 * `collapseOnChildClick` is the Footer's opt-in: activating a leaf row among
 * the `children` (a link or button row) collapses the disclosure — the
 * footer's rows are choices, consumed by activating them. The content tree
 * does not opt in: its branch stays open so the active row remains visible.
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

  // The seed above is mount-only. This one-way sync re-opens the disclosure
  // when its branch becomes active on navigation (the seed flipping true
  // means a nested sub-item's route is selected): a user landing on — or
  // routing to — a nested route must find its parent open. Deliberately
  // one-way: a manual collapse stays collapsed, and the disclosure never
  // auto-closes.
  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  // Unique per instance and ident-safe (useId may contain ":" on older
  // React). Wires the collapsed-rail popover's CSS anchor positioning: the
  // summary anchors, the children panel is positioned against it — the
  // browser flips the panel on overflow (position-try-fallbacks in
  // styles.css); no measurement JS anywhere.
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
  // cancelable, and merely skipping the React state update wouldn't undo a
  // toggle the browser already applied to the DOM (nothing would force a
  // corrective re-render, since the controlled `open` value never changed).
  // Preventing the summary's default action stops the native disclosure from
  // toggling at all.
  const handleSummaryClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (disabled) event.preventDefault();
    },
    [disabled],
  );

  // Footer opt-in (`collapseOnChildClick`): activating a leaf row among the
  // children — a link or button row (the summary has neither, so it is
  // excluded by the closest() check, and its native toggle is left alone) —
  // collapses the disclosure. Delegated on the list so the row components
  // stay unaware of their disclosure parent.
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
          {/* `title` — native tooltip fallback for truncated text; the 24.04 spec §10.17. */}
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
