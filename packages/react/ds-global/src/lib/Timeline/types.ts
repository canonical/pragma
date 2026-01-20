import type { HTMLAttributes, ReactElement } from "react";
import type { ContentProps } from "./common/Content/types.js";
import type { EventProps } from "./common/Event/types.js";

/**
 * Props for the Timeline component
 *
 * @implements dso:global.pattern.timeline
 *
 * Anatomy (from DSL):
 * - layout.type: stack
 * - layout.direction: vertical
 * - edges:
 *   - [0] timeline-header (cardinality: 0..1) - NOT IMPLEMENTED
 *   - [1] timeline-content (cardinality: 1, slotName: default)
 *   - [2] timeline-footer (cardinality: 0..1) - NOT IMPLEMENTED
 *
 * Note: Timeline.Header and Timeline.Footer are not yet implemented.
 */
export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Timeline.Content element (required)
   * Maps to DSL edges[1]: timeline-content (cardinality: 1)
   */
  children: ReactElement<ContentProps>;
}

/**
 * Timeline component type with attached subcomponents
 */
export type TimelineComponent = ((props: TimelineProps) => ReactElement) & {
  Content: (props: ContentProps) => ReactElement;
  Event: (props: EventProps) => ReactElement;
};
