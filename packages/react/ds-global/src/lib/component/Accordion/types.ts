import type { HTMLAttributes, ReactElement, RefObject } from "react";
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
 * Context options for accordion keyboard navigation.
 * Implements WAI-ARIA Accordion Pattern keyboard interactions.
 */
export interface AccordionContextOptions {
  /**
   * Register a header button ref for keyboard navigation
   */
  registerHeader: (ref: RefObject<HTMLButtonElement | null>) => () => void;
  /**
   * Handle keyboard navigation between headers
   */
  handleKeyNavigation: (
    event: React.KeyboardEvent,
    currentRef: RefObject<HTMLButtonElement | null>,
  ) => void;
}

/**
 * Accordion component type with attached subcomponents
 */
export type AccordionComponent = ((props: AccordionProps) => ReactElement) & {
  Item: (props: ItemProps) => ReactElement | null;
};
