import type React from "react";
import { Item } from "./common/index.js";
import type { AccordionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds accordion";

/**
 * Accordion component
 *
 * A vertically stacked content area which can be collapsed and expanded
 * to reveal or hide its contents. Each Accordion.Item can be opened or
 * closed independently of its surrounding counterparts.
 *
 * @implements ds:global.component.accordion
 *
 * @example
 * ```tsx
 * <Accordion>
 *   <Accordion.Item heading="Section 1" expanded>
 *     Content for section 1
 *   </Accordion.Item>
 *   <Accordion.Item heading="Section 2">
 *     Content for section 2
 *   </Accordion.Item>
 * </Accordion>
 * ```
 */
const Accordion = ({
  className,
  children,
  ...props
}: AccordionProps): React.ReactElement => (
  <div
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </div>
);

Accordion.Item = Item;

export default Accordion;
