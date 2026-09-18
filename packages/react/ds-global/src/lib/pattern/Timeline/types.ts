import type { ModifierFamily } from "@canonical/ds-types";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { EventProps } from "./common/Event/types.js";
import type { ExpansionIndicatorProps } from "./common/ExpansionIndicator/types.js";
import type { HeaderProps } from "./common/Header/types.js";

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

export type TimelineDataProps = {
  items: TimelineItem[];
  /** Header controls visibility. All default true. */
  showControls?: boolean;
  showActorFilter?: boolean;
  showEventFilter?: boolean;
  showSorting?: boolean;
  actorFilterLabel?: string;
  eventFilterLabel?: string;
  defaultSortOrder?: TimelineSortOrder;
  sortOrder?: TimelineSortOrder;
  onSortOrderChange?: (order: TimelineSortOrder) => void;
  defaultFilters?: TimelineFilterState;
  filters?: TimelineFilterState;
  onFiltersChange?: (filters: TimelineFilterState) => void;
  /** Persist filters and sort as URL query params. Default false. */
  syncUrlParams?: boolean;
  /** Query-param namespace. Default "tl". */
  paramPrefix?: string;
  /**
   * How URL writes enter the history stack: `"replace"` rewrites the
   * current entry, `"push"` adds one so back and forward restore earlier
   * filter and sort states. Default `"replace"`.
   */
  urlHistory?: "replace" | "push";
  /** Default "trailing". */
  dateTimePosition?: TimelineDateTimePosition;
  /** Default "all-sizes". */
  markerCombination?: TimelineMarkerCombination;
  /** Default `{ method: "bottom" }`; false disables. */
  expansion?: TimelineExpansion | false;
  dateTimeFormats?: TimelineDateTimeFormatProps;
  /** Always the last node; the connector line attaches to it. */
  trailing?: ReactNode;
  /** Full render control per item; `null` renders an empty item. */
  renderItem?: (
    item: TimelineItem,
    context: TimelineRenderContext,
  ) => ReactNode;
  label?: string;
  onVisibleItemsChange?: (visible: TimelineItem[]) => void;
};

/** Fully data-driven: everything except `items` is derived. */
export type TimelineProps = TimelineDataProps &
  Omit<ComponentProps<"div">, keyof TimelineDataProps>;

export type TimelineComponent = ((props: TimelineProps) => ReactElement) & {
  Event: (props: EventProps) => ReactElement;
  Header: (props: HeaderProps) => ReactElement;
  ExpansionIndicator: (props: ExpansionIndicatorProps) => ReactElement;
};
