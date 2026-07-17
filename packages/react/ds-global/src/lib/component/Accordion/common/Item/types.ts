import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /**
   * The accordion item's heading. Pass a node — including the heading element
   * (e.g. `<h3>…</h3>`) at the level appropriate for the page's document
   * outline — so heading semantics stay the consumer's responsibility.
   * Maps to DSL role: heading (cardinality: 1)
   */
  heading: ReactNode;
  /**
   * The content revealed when the accordion item is expanded
   * Maps to DSL role: content panel (cardinality: 1)
   */
  children: ReactNode;
  /**
   * Whether the accordion item is expanded. Controls the native `open`
   * attribute; pair with `onExpandedChange` for a controlled item.
   * @default false
   */
  expanded?: boolean;
  /**
   * Callback fired when the expanded state changes (from the native toggle).
   */
  onExpandedChange?: (expanded: boolean) => void;
};

/**
 * Props for the Accordion.Item subcomponent
 *
 * @implements dso:global.subcomponent.accordion-item
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - edges:
 *   - header tab (slotName: header, cardinality: 1)
 *     - control (chevron, cardinality: 1)
 *     - heading (slotName: default, cardinality: 1)
 *   - content panel (slotName: default, cardinality: 1)
 *
 * Rendered with native `<details>`/`<summary>`, so the browser owns the
 * open/close state and keyboard interaction. `expanded` (with
 * `onExpandedChange`) is an optional controlled overlay on the native `open`
 * attribute.
 *
 * The native `open` and `onToggle` are deliberately excluded: the DS drives
 * `open` from `expanded` and fires `onExpandedChange` from the native toggle,
 * so consumers control open state through those props, not the raw attributes.
 */
export type ItemProps = OwnProps &
  Omit<ComponentProps<"details">, keyof OwnProps | "open" | "onToggle">;
