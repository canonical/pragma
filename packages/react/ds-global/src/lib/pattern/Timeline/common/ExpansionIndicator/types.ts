import type { ComponentProps } from "react";

type OwnProps = {
  /** Summary text: how many events are hidden. */
  hiddenCount?: number;
  /** Events revealed per "Show more". */
  step?: number;
  onShowMore?: () => void;
  onShowAll?: () => void;
};

/**
 * Props for the Timeline.ExpansionIndicator subcomponent
 *
 * @implements ds:global.subcomponent.timeline-expansion-indicator
 */
export type ExpansionIndicatorProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
