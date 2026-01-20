import type React from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import { useAccordion } from "../../hooks/index.js";
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
 * Keyboard support:
 * - Enter/Space: Toggle expand/collapse
 * - Arrow Down: Move focus to next accordion header
 * - Arrow Up: Move focus to previous accordion header
 * - Home: Move focus to first accordion header
 * - End: Move focus to last accordion header
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
  const headerRef = useRef<HTMLButtonElement>(null);
  const accordion = useAccordion();

  // Register this header for keyboard navigation
  useEffect(() => {
    if (accordion) {
      return accordion.registerHeader(headerRef);
    }
  }, [accordion]);

  const handleClick = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Toggle on Enter or Space
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onExpandedChange?.(!expanded);
        return;
      }

      // Arrow/Home/End navigation between accordion items
      if (accordion) {
        accordion.handleKeyNavigation(event, headerRef);
      }
    },
    [expanded, onExpandedChange, accordion],
  );

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* Header tab (cardinality: 1) */}
      <button
        ref={headerRef}
        type="button"
        id={headerId}
        className="header"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Control/Chevron indicator (cardinality: 1) */}
        <span className="chevron" aria-hidden="true" />
        {/* Heading (cardinality: 1) */}
        <span className="heading">{heading}</span>
      </button>

      {/* Content panel (cardinality: 1) */}
      <section
        id={contentId}
        aria-labelledby={headerId}
        className="content"
        hidden={!expanded}
      >
        {/* Content padding wrapper */}
        <div className="content-inner">{children}</div>
      </section>
    </div>
  );
};

Item.displayName = "Accordion.Item";

export default Item;
