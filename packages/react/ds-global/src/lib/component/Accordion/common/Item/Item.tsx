import type React from "react";
import { useCallback } from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds accordion-item";

/**
 * Accordion.Item subcomponent
 *
 * A collapsible content area within an Accordion, rendered with native
 * `<details>`/`<summary>` so the browser owns the open/close state and
 * keyboard interaction (Enter/Space on the summary toggles it). No JavaScript
 * state is required; `expanded`/`onExpandedChange` is an optional controlled
 * overlay on the native `open` attribute.
 *
 * @implements dso:global.subcomponent.accordion-item
 */
const Item = ({
  heading,
  children,
  expanded = false,
  onExpandedChange,
  className,
  ...props
}: ItemProps): React.ReactElement => {
  const handleToggle = useCallback(
    (event: React.SyntheticEvent<HTMLDetailsElement>) => {
      onExpandedChange?.(event.currentTarget.open);
    },
    [onExpandedChange],
  );

  return (
    <details
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      open={expanded}
      onToggle={handleToggle}
      {...props}
    >
      {/* Header tab — <summary> owns the button semantics + keyboard toggle.
          The consumer supplies heading semantics inside `heading`. */}
      <summary className="header">
        {/* Control/chevron indicator (cardinality: 1) */}
        <span className="chevron" aria-hidden="true" />
        <span className="heading">{heading}</span>
      </summary>

      {/* Content panel (cardinality: 1). `.editorial` is a prose context — it
          gives child <p>/headings their baseline spacing without adding its own
          baseline padding, so it doesn't double up on content that is already
          `.p`. */}
      <div className="content editorial">{children}</div>
    </details>
  );
};

Item.displayName = "Accordion.Item";

export default Item;
