import type React from "react";
import { useCallback, useId } from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds accordion-item";

/**
 * Accordion.Item subcomponent
 *
 * A collapsible content area within an Accordion.
 * Follows the DSL anatomy:
 * - Stack layout (vertical)
 * - Header tab with control (chevron) + heading
 * - Content panel
 *
 * @implements ds:global.subcomponent.accordion-item
 */
const Item = ({
  heading,
  children,
  expanded = false,
  onExpandedChange,
  className,
  ...props
}: ItemProps): React.ReactElement => {
  const headerId = useId();
  const contentId = useId();

  const handleClick = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onExpandedChange?.(!expanded);
      }
    },
    [expanded, onExpandedChange],
  );

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* Header tab (cardinality: 1) */}
      <button
        type="button"
        id={headerId}
        className="accordion-item-header"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Control/Chevron indicator (cardinality: 1) */}
        <span className="accordion-item-chevron" aria-hidden="true" />
        {/* Heading (cardinality: 1) */}
        <span className="accordion-item-heading">{heading}</span>
      </button>

      {/* Content panel (cardinality: 1) */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className="accordion-item-content"
        hidden={!expanded}
      >
        {/* Content padding wrapper */}
        <div className="accordion-item-content-inner">{children}</div>
      </div>
    </div>
  );
};

Item.displayName = "Accordion.Item";

export default Item;
