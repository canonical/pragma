import type { HTMLAttributes, ReactNode } from "react";

/**
 * Criticality modifier values
 * Maps to DSL modifierFamily: criticality
 */
export type Criticality = "info" | "success" | "warning" | "critical";

/**
 * Props for the Timeline.Event subcomponent
 *
 * @implements dso:global.subcomponent.timeline-event
 *
 * Anatomy (from DSL):
 * - layout.type: flow
 * - layout.direction: horizontal
 * - edges:
 *   - [0] actor (role: actor, cardinality: 0..1)
 *   - [1] datetime (role: datetime, cardinality: 0..1)
 *   - [2] payload (role: payload, cardinality: 1, slotName: default)
 */
export interface EventProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Actor/user who performed the action
   * Maps to DSL role: actor (cardinality: 0..1)
   */
  actor?: ReactNode;
  /**
   * Date/time of the event
   * Maps to DSL role: datetime (cardinality: 0..1)
   */
  datetime?: ReactNode;
  /**
   * Event content/description
   * Maps to DSL role: payload (cardinality: 1, slotName: default)
   */
  children: ReactNode;
  /**
   * Visual criticality modifier for the event
   * Maps to DSL hasModifierFamily: criticality
   */
  criticality?: Criticality;
}
