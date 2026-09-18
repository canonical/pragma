import type { ModifierFamily } from "@canonical/ds-types";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { ContentProps } from "./common/Content/types.js";
import type { EventProps } from "./common/Event/types.js";

export type TimelineSortOrder = "newest" | "oldest";

export type TimelineDateTimePosition = "leading" | "trailing";

export type TimelineMarkerCombination =
  | "all-sizes"
  | "large-medium"
  | "large-small"
  | "medium-small"
  | "large"
  | "medium"
  | "small";

export type TimelineCollapsingMethod = "none" | "bottom" | "middle";

export type TimelineMarkerSize = "large" | "medium" | "small";

/** Marker graphic; first of customGraphic, imageUrl, icon, initials wins. */
export type TimelineMarker = {
  customGraphic?: ReactNode;
  imageUrl?: string;
  alt?: string;
  icon?: ReactNode;
  initials?: string;
  size?: TimelineMarkerSize;
};

/** One data-driven timeline event. */
export type TimelineItem = {
  /** Stable identity: React key and expansion restore. */
  id: string;
  /**
   * ISO 8601 timestamp; drives sort and `<time datetime>`.
   *
   * @note Sort reads this via `Date.parse` today — engine-dependent on
   * out-of-range dates and timezone-dependent on offsetless date-times; see
   * the debt note on `sortItems` in `useTimelineFilters.ts`. Prefer
   * offset-bearing forms.
   */
  dateTime: string;
  /** Filter key; also drives consecutive-run marker sizing. */
  actorId?: string;
  actorName?: string;
  /** Profile URL; marker and name become links. */
  actorLink?: string;
  /** Event-filter key. */
  eventType?: string;
  eventLabel?: string;
  description?: string;
  customContent?: ReactNode;
  marker?: TimelineMarker;
  /** Only the marker and `customContent` render. */
  fullyCustom?: boolean;
  showName?: boolean;
  showDescription?: boolean;
  showDateTime?: boolean;
  criticality?: ModifierFamily<"criticality">;
};

export type TimelineFilterOption = { value: string; label: string };

export type TimelineFilterState = {
  actorId?: string;
  eventType?: string;
};

export type TimelineExpansion = {
  method?: TimelineCollapsingMethod;
  /** Default 8. */
  initialVisible?: number;
  /** Events revealed per "Show more". Default 4. */
  step?: number;
};

export type TimelineDateTimeFormatProps = {
  formatAbsolute?: (iso: string, locale: string) => string;
  formatRelative?: (iso: string, now: number, locale: string) => string;
  /** Click toggles absolute/relative for all events. Default true. */
  toggleable?: boolean;
  /** Hover tooltip shows the alternate format. Default true. */
  tooltip?: boolean;
};

export type TimelineRenderContext = {
  order: TimelineSortOrder;
  isVisible: boolean;
  isFiltered: boolean;
  markerSize: TimelineMarkerSize;
  index: number;
};

type OwnProps = {
  /**
   * Timeline.Content element (required)
   * Maps to DSL edges[1]: timeline-content (cardinality: 1)
   */
  children: ReactElement<ContentProps>;
};

/**
 * Props for the Timeline component
 *
 * @implements ds:global.pattern.timeline
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
export type TimelineProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;

/**
 * Timeline component type with attached subcomponents
 */
export type TimelineComponent = ((props: TimelineProps) => ReactElement) & {
  Content: (props: ContentProps) => ReactElement;
  Event: (props: EventProps) => ReactElement;
};
