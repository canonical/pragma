import type { ComponentProps } from "react";
import type {
  TimelineDateTimePosition,
  TimelineItem,
  TimelineMarkerSize,
} from "../../types.js";

/** Shared dateTime format state: one mode for the whole timeline. */
export type EventDateTimeProps = {
  format: (iso: string) => { display: string; alternate: string };
  toggleable: boolean;
  tooltip: boolean;
  /** Drives `aria-pressed`. */
  pressed: boolean;
  onToggle: () => void;
};

type OwnProps = {
  item: TimelineItem;
  /** Derived from `markerCombination`; `item.marker.size` wins. */
  markerSize?: TimelineMarkerSize;
  dateTime?: EventDateTimeProps;
  /** Default "trailing". */
  datetimePosition?: TimelineDateTimePosition;
};

/**
 * Props for the Timeline.Event subcomponent
 *
 * @implements ds:global.subcomponent.timeline-event
 */
export type EventProps = OwnProps & Omit<ComponentProps<"div">, keyof OwnProps>;
