import type React from "react";
import Context from "./Context.js";
import { Item } from "./common/index.js";
import { useAccordionState } from "./hooks/index.js";
import type { AccordionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds accordion";

/**
 * The accordion is a vertically stacked content area which can be collapsed
 * and expanded to reveal or hide its contents. An Accordion.Item can be opened
 * or closed independently of its surrounding counterparts (i.e: multiple
 * accordions can be open at the same time).
 *
 * Implements WAI-ARIA Accordion Pattern keyboard navigation:
 * - Arrow Down: Move focus to next accordion header
 * - Arrow Up: Move focus to previous accordion header
 * - Home: Move focus to first accordion header
 * - End: Move focus to last accordion header
 *
 * @implements ds:global.component.accordion
 */
const Accordion = ({
  className,
  children,
  ...props
}: AccordionProps): React.ReactElement => {
  const state = useAccordionState();

  return (
    <Context.Provider value={state}>
      <div
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
      </div>
    </Context.Provider>
  );
};

Accordion.Item = Item;

export default Accordion;
