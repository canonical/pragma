import type React from "react";
import { Item } from "./common/index.js";
import type { AccordionProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds accordion";

/**
 * The accordion is a vertically stacked content area which can be collapsed
 * and expanded to reveal or hide its contents. An Accordion.Item can be opened
 * or closed independently of its surrounding counterparts (i.e: multiple
 * accordions can be open at the same time).
 *
 * @implements ds:global.component.accordion
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
