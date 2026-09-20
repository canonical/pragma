import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import type { ItemExpandableProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-expandable";

/**
 * SideNavigation.ItemExpandable — a collapsible row that discloses its own
 * (always-leaf) children instead of navigating. Native
 * `<details>`/`<summary>` — no `role`/`aria-expanded` authored, per
 * `cs:ui_blocks.nojs.disclosure`; the element owns its own open state.
 * `heading` and `children` are composed, not string props — matching
 * `Accordion.Item`'s own split.
 *
 * `defaultExpanded` seeds the initial state (NavTree supplies it from the
 * tree's own state: whether this node's branch is the selected one) and is
 * live in one direction only: when it turns `true` on navigation the
 * disclosure re-opens — a manual collapse stays collapsed and the
 * disclosure never auto-closes.
 *
 * `collapseOnChildClick` is the Footer's opt-in: activating a leaf row
 * among the `children` collapses the disclosure. The content tree does not
 * opt in: its branch stays open so the active row remains visible.
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
  // Uncontrolled: the <details> owns its open state and React never
  // re-asserts it. The attribute is seeded from a mount-only snapshot of
  // `defaultExpanded` — not the live prop, so a seed flipping back to false
  // never force-closes an open disclosure — and the two imperative
  // behaviours below reach the DOM through the ref.
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const initialExpanded = useRef(defaultExpanded).current;

  // One-way re-open: navigation making this branch the selected one flips
  // the seed true, and the disclosure re-opens. Manual collapses stay
  // collapsed; the disclosure never auto-closes.
  useEffect(() => {
    const details = detailsRef.current;
    if (defaultExpanded && details && !details.open) {
      details.open = true;
    }
  }, [defaultExpanded]);

  // Guards the CLICK, not the toggle: the native `toggle` event isn't
  // cancelable, and preventing the summary's default stops the disclosure
  // toggling at all.
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
      const details = detailsRef.current;
      if (
        collapseOnChildClick &&
        details &&
        (event.target as Element).closest("a, button")
      ) {
        details.open = false;
      }
    },
    [collapseOnChildClick],
  );

  // Unique per instance and ident-safe (useId may contain ":" on older
  // React). Wires the collapsed-rail popover's CSS anchor positioning: the
  // summary anchors, the panel positions against it, and the browser flips
  // it on overflow (`position-try-fallbacks` in styles.css) — no
  // measurement JS.
  const anchorName = `--sidenav-expandable-${useId().replace(
    /[^a-zA-Z0-9]/g,
    "",
  )}`;

  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
      {...props}
    >
      <details
        className="details"
        ref={detailsRef}
        open={initialExpanded || undefined}
      >
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
          {/* `title` — native tooltip fallback for truncated text. */}
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
