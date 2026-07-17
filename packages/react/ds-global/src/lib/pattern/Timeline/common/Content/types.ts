import type { ComponentProps, ReactElement } from "react";
import type { EventProps } from "../Event/types.js";

type OwnProps = {
  /**
   * Timeline.Event elements
   * Maps to DSL cardinality: 0..* (zero or more)
   */
  children?: ReactElement<EventProps> | ReactElement<EventProps>[] | null;
};

/**
 * Props for the Timeline.Content subcomponent
 *
 * @implements dso:global.subcomponent.timeline-content
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - edges:
 *   - [0] timeline-event (cardinality: 0..*, slotName: default)
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
