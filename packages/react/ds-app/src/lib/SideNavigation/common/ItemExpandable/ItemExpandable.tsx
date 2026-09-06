import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import { useCallback, useState } from "react";
import type { ItemExpandableProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-expandable";

/**
 * SideNavigation.ItemExpandable — a collapsible row that discloses its own
 * (always-leaf) children instead of navigating (SPEC.md §4.3). Native
 * `<details>`/`<summary>` — no `role`/`aria-expanded` authored, per
 * `cs:ui_blocks.nojs.disclosure`; the element supplies the disclosure
 * semantics itself, correctly, without scripting. `heading` (the summary's
 * own label) and `children` (what disclosure reveals) are composed, not
 * string props — matching `Accordion.Item`'s own `heading`/`children` split.
 *
 * Uncontrolled — seeded by `defaultExpanded`, mirroring SideNavigation's own
 * rail-collapse state, not Accordion.Item's externally-controlled circuit:
 * each instance is independent (no accordion/single-open behaviour) and
 * NavTree only needs to supply an *initial* value (SPEC.md §5).
 *
 * @implements ds:apps.subcomponent.side-navigation-item-expandable
 */
const ItemExpandable = ({
  heading,
  icon,
  disabled = false,
  defaultExpanded = false,
  children,
  className,
  key: _key,
  ...props
}: ItemExpandableProps): React.ReactElement => {
  const [expanded, setExpanded] = useState(defaultExpanded);

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

  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
      {...props}
    >
      <details className="details" open={expanded} onToggle={handleToggle}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: <summary> is the native disclosure trigger for its <details> (implicit button semantics per HTML-AAM); biome's static-element check doesn't recognise it. */}
        <summary className="row" onClick={handleSummaryClick}>
          {/* Start cell is always rendered (empty when no icon), matching
              Item, so content stays aligned whether or not a row has an icon. */}
          <span className="start p">
            {icon ? <Icon width={16} height={16} icon={icon} /> : null}
          </span>
          {/* `title` — native tooltip fallback for truncated text; SPEC.md §10.17. */}
          <span
            className="label p"
            title={typeof heading === "string" ? heading : undefined}
          >
            {heading}
          </span>
          <Icon icon="chevron-down" className="end caret" />
        </summary>
        <ul className="children">{children}</ul>
      </details>
    </li>
  );
};

export default ItemExpandable;
