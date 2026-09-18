import type { ComponentProps } from "react";
import type {
  TimelineFilterOption,
  TimelineFilterState,
  TimelineSortOrder,
} from "../../types.js";

type OwnProps = {
  /** Filter menu options — inferred from the data in data-driven mode. */
  actorOptions?: TimelineFilterOption[];
  eventOptions?: TimelineFilterOption[];
  /** Active filter values. */
  filters?: TimelineFilterState;
  onFiltersChange?: (filters: TimelineFilterState) => void;
  /** Current sort order; the sort button label states it. */
  sortOrder?: TimelineSortOrder;
  onSortOrderChange?: (order: TimelineSortOrder) => void;
  /** Control visibility. Default true. */
  showActorFilter?: boolean;
  showEventFilter?: boolean;
  showSorting?: boolean;
  /** Filter trigger labels. Default "Actor"/"Event". */
  actorFilterLabel?: string;
  eventFilterLabel?: string;
};

/**
 * Props for the Timeline.Header subcomponent
 *
 * @implements ds:global.subcomponent.timeline-header
 */
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
