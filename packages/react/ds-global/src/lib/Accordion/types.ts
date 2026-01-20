import type { HTMLAttributes, ReactElement } from "react";
import type { ItemProps } from "./common/Item/types.js";

/**
 * Props for the Accordion component
 */
export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Accordion.Item elements to render
   */
  children: ReactElement<ItemProps> | ReactElement<ItemProps>[];
}

/**
 * Accordion component type with attached subcomponents
 */
export type AccordionComponent = ((
  props: AccordionProps,
) => ReactElement) & {
  Item: (props: ItemProps) => ReactElement | null;
};
