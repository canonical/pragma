import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Event } from "./common/Event/index.js";
import { ExpansionIndicator } from "./common/ExpansionIndicator/index.js";
import { Header } from "./common/Header/index.js";
import { useDateTimeFormats } from "./hooks/useDateTimeFormats.js";
import { useTimelineExpansion } from "./hooks/useTimelineExpansion.js";
import { useTimelineFilters } from "./hooks/useTimelineFilters.js";
import {
  type TimelineUrlState,
  useTimelineUrlParams,
  writeTimelineUrlParams,
} from "./hooks/useTimelineUrlParams.js";
import type {
  TimelineFilterState,
  TimelineItem,
  TimelineProps,
  TimelineSortOrder,
} from "./types.js";
import {
  resolveMarkerSize,
  resolveMarkerSizes,
} from "./utils/markerCombination.js";
import "./styles.css";

type AdoptedUrlState = {
  filters: TimelineFilterState;
  sortOrder: TimelineSortOrder;
};

/** Whether two adopted-URL states spell the same filters and sort. */
function isSameUrlState(a: AdoptedUrlState, b: AdoptedUrlState): boolean {
  return (
    a.filters.actorId === b.filters.actorId &&
    a.filters.eventType === b.filters.eventType &&
    a.sortOrder === b.sortOrder
  );
}

const componentCssClassName = "ds timeline";

/**
 * A chronological list of events. Fully data-driven: pass `items` and the
 * component derives filters, sort order, expansion, markers, and datetime
 * formats from them.
 *
 * `import { Timeline } from "@canonical/ds-global";`
 *
 * @implements ds:global.pattern.timeline
 */
const Timeline = ({
  items,
  showControls = true,
  showActorFilter = true,
  showEventFilter = true,
  showSorting = true,
  actorFilterLabel,
  eventFilterLabel,
  defaultSortOrder,
  sortOrder,
  onSortOrderChange,
  defaultFilters,
  filters,
  onFiltersChange,
  syncUrlParams = false,
  paramPrefix = "tl",
  urlHistory = "replace",
  dateTimePosition = "trailing",
  markerCombination = "all-sizes",
  expansion,
  dateTimeFormats,
  trailing,
  renderItem,
  label,
  onVisibleItemsChange,
  className,
  ...rest
}: TimelineProps): React.ReactElement => {
  const {
    actorOptions,
    eventOptions,
    filters: activeFilters,
    setFilters,
    sortOrder: activeSortOrder,
    setSortOrder,
    visible,
  } = useTimelineFilters({
    items,
    filters,
    defaultFilters,
    onFiltersChange,
    sortOrder,
    defaultSortOrder,
    onSortOrderChange,
  });

  const {
    topCount,
    bottomCount,
    hiddenCount,
    indicatorPosition,
    step,
    showMore,
    showAll,
  } = useTimelineExpansion({
    count: visible.length,
    method: expansion === false ? "none" : expansion?.method,
    initialVisible: expansion === false ? undefined : expansion?.initialVisible,
    step: expansion === false ? undefined : expansion?.step,
  });

  const dateTimeState = useDateTimeFormats(dateTimeFormats);

  // The URL state an adoption just applied, consumed once by the write
  // effect so back/forward never pushes a duplicate of the entry the
  // reader just left.
  const adoptedUrlStateRef = useRef<AdoptedUrlState | null>(null);
  // Skip the first write: the mount read (or the caller's props) is truth.
  const firstWriteRef = useRef(true);

  const onParams = useCallback(
    (state: TimelineUrlState, source: "mount" | "popstate") => {
      if (source === "popstate") {
        // Back/forward applies the URL state wholesale.
        const adoptedFilters =
          state.filters.actorId || state.filters.eventType
            ? state.filters
            : (defaultFilters ?? {});
        const adoptedSort = state.sortOrder ?? defaultSortOrder ?? "oldest";
        adoptedUrlStateRef.current = {
          filters: adoptedFilters,
          sortOrder: adoptedSort,
        };
        setFilters(adoptedFilters);
        setSortOrder(adoptedSort);
        return;
      }
      // On mount only apply what the URL carries; props win otherwise.
      const carriesFilters = Boolean(
        state.filters.actorId || state.filters.eventType,
      );
      if (carriesFilters) {
        setFilters(state.filters);
      }
      if (state.sortOrder) {
        setSortOrder(state.sortOrder);
      }
      if (carriesFilters || state.sortOrder) {
        adoptedUrlStateRef.current = {
          filters: carriesFilters ? state.filters : activeFilters,
          sortOrder: state.sortOrder ?? activeSortOrder,
        };
      }
    },
    [
      setFilters,
      setSortOrder,
      defaultFilters,
      defaultSortOrder,
      activeFilters,
      activeSortOrder,
    ],
  );
  useTimelineUrlParams({
    enabled: syncUrlParams,
    prefix: paramPrefix,
    onParams,
  });

  useEffect(() => {
    if (!syncUrlParams) {
      return;
    }
    if (firstWriteRef.current) {
      firstWriteRef.current = false;
      return;
    }
    const next: AdoptedUrlState = {
      filters: activeFilters,
      sortOrder: activeSortOrder,
    };
    if (
      adoptedUrlStateRef.current &&
      isSameUrlState(adoptedUrlStateRef.current, next)
    ) {
      // The URL already spells this state: an adoption echo, not a change.
      adoptedUrlStateRef.current = null;
      return;
    }
    writeTimelineUrlParams(paramPrefix, next, urlHistory);
    adoptedUrlStateRef.current = null;
  }, [syncUrlParams, paramPrefix, urlHistory, activeFilters, activeSortOrder]);

  const markerSizes = useMemo(
    () => resolveMarkerSizes(visible, markerCombination),
    [visible, markerCombination],
  );
  const sizeByIndex = useMemo(
    () => new Map(visible.map((item, index) => [item.id, markerSizes[index]])),
    [visible, markerSizes],
  );

  useEffect(() => {
    onVisibleItemsChange?.(visible);
  }, [visible, onVisibleItemsChange]);

  const isFiltered = Boolean(activeFilters.actorId || activeFilters.eventType);
  const topItems = visible.slice(0, topCount);
  // "middle" anchors the bottom slice to the list's end; "bottom" grows downward.
  const bottomItems =
    indicatorPosition === "middle"
      ? visible.slice(visible.length - bottomCount)
      : visible.slice(0, bottomCount);
  // Index within `visible` of the bottom slice's first item.
  const bottomStart =
    indicatorPosition === "middle" ? visible.length - bottomCount : topCount;
  const renderedCount = topItems.length + bottomItems.length;
  const statusText = `Showing ${renderedCount} of ${visible.length} events`;

  const renderEvent = (item: TimelineItem, index: number) => {
    const markerSize = resolveMarkerSize(item, sizeByIndex.get(item.id));
    if (renderItem) {
      return (
        <li className="ds timeline-item" key={item.id}>
          {renderItem(item, {
            order: activeSortOrder,
            isVisible: true,
            isFiltered,
            markerSize,
            index,
          }) ?? null}
        </li>
      );
    }
    return (
      <li className="ds timeline-item" key={item.id}>
        <Event
          item={item}
          markerSize={sizeByIndex.get(item.id)}
          datetimePosition={dateTimePosition}
          dateTime={{
            format: dateTimeState.format,
            toggleable: dateTimeState.toggleable,
            tooltip: dateTimeState.tooltip,
            pressed: dateTimeState.mode === "relative",
            onToggle: dateTimeState.toggle,
          }}
        />
      </li>
    );
  };

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the container is a region only when a label is provided
    <div
      className={[
        componentCssClassName,
        trailing ? "has-trailing" : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      role={label ? "region" : undefined}
      {...rest}
    >
      {showControls ? (
        <Header
          actorOptions={actorOptions}
          eventOptions={eventOptions}
          filters={activeFilters}
          onFiltersChange={setFilters}
          sortOrder={activeSortOrder}
          onSortOrderChange={setSortOrder}
          showActorFilter={showActorFilter}
          showEventFilter={showEventFilter}
          showSorting={showSorting}
          actorFilterLabel={actorFilterLabel}
          eventFilterLabel={eventFilterLabel}
        />
      ) : null}

      <p className="ds timeline-status" aria-live="polite">
        {statusText}
      </p>

      <ol className="ds timeline-content">
        {topItems.map(renderEvent)}
        {indicatorPosition === "middle" ? (
          <li className="ds timeline-item expansion" key="expansion">
            <ExpansionIndicator
              hiddenCount={hiddenCount}
              step={step}
              onShowMore={showMore}
              onShowAll={showAll}
            />
          </li>
        ) : null}
        {bottomItems.map((item, index) =>
          renderEvent(item, bottomStart + index),
        )}
        {indicatorPosition === "bottom" ? (
          <li className="ds timeline-item expansion" key="expansion">
            <ExpansionIndicator
              hiddenCount={hiddenCount}
              step={step}
              onShowMore={showMore}
              onShowAll={showAll}
            />
          </li>
        ) : null}
      </ol>

      {/* Always the last node; the connector line attaches to it */}
      {trailing ? <div className="ds timeline-trailing">{trailing}</div> : null}
    </div>
  );
};

Timeline.Event = Event;
Timeline.Header = Header;
Timeline.ExpansionIndicator = ExpansionIndicator;

export default Timeline;
