import type { ComponentProps, ReactElement } from "react";
import type { ItemProps } from "./common/Item/types.js";

type OwnProps = {
  /**
   * Accordion.Item elements to render
   */
  children: ReactElement<ItemProps> | ReactElement<ItemProps>[];
};

/**
 * Props for the Accordion component
 */
export type AccordionProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;

/**
 * Accordion component type with attached subcomponents
 */
export type AccordionComponent = ((props: AccordionProps) => ReactElement) & {
  Item: (props: ItemProps) => ReactElement;
};
