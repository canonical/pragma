import type React from "react";
import type { MenuEntry } from "../../../../component/ContextualMenu/index.js";
import { ContextualMenu } from "../../../../component/ContextualMenu/index.js";
import { Icon } from "../../../../component/Icon/index.js";
import type { TimelineFilterOption } from "../../types.js";
import type { HeaderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-header";

function buildMenuItems(
  options: readonly TimelineFilterOption[],
  activeValue: string | undefined,
): MenuEntry[] {
  return options.map((option) => ({
    key: option.value,
    label: option.label,
    icon: activeValue === option.value ? <Icon icon="checkmark" /> : undefined,
  }));
}

/**
 * Timeline.Header subcomponent — the control bar for filtering and sorting
 * the timeline. The sort button label states the current order; the reset
 * button appears only when a filter is active.
 *
 * @implements ds:global.subcomponent.timeline-header
 */
const Header = ({
  actorOptions = [],
  eventOptions = [],
  filters,
  onFiltersChange,
  sortOrder,
  onSortOrderChange,
  showActorFilter = true,
  showEventFilter = true,
  showSorting = true,
  actorFilterLabel = "Actor",
  eventFilterLabel = "Event",
  className,
  ...props
}: HeaderProps): React.ReactElement => {
  const hasActiveFilter = Boolean(filters?.actorId || filters?.eventType);
  const showActor = showActorFilter && actorOptions.length > 0;
  const showEvent = showEventFilter && eventOptions.length > 0;

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* Filters */}
      {showActor || showEvent ? (
        <div className="filters">
          <span className="filter-label">Filter by:</span>
          {showActor ? (
            <ContextualMenu
              label={`Filter by ${actorFilterLabel.toLowerCase()}`}
              maxWidth="fit-content"
              items={buildMenuItems(actorOptions, filters?.actorId)}
              onSelect={(item) => {
                const next =
                  filters?.actorId && filters.actorId === item.key
                    ? { ...filters, actorId: undefined }
                    : { ...filters, actorId: item.key };
                onFiltersChange?.(next);
              }}
            >
              <span className="trigger-content">
                <span className="label">{actorFilterLabel}</span>
                <Icon icon="chevron-down" />
              </span>
            </ContextualMenu>
          ) : null}
          {showEvent ? (
            <ContextualMenu
              label={`Filter by ${eventFilterLabel.toLowerCase()}`}
              maxWidth="fit-content"
              items={buildMenuItems(eventOptions, filters?.eventType)}
              onSelect={(item) => {
                const next =
                  filters?.eventType && filters.eventType === item.key
                    ? { ...filters, eventType: undefined }
                    : { ...filters, eventType: item.key };
                onFiltersChange?.(next);
              }}
            >
              <span className="trigger-content">
                <span className="label">{eventFilterLabel}</span>
                <Icon icon="chevron-down" />
              </span>
            </ContextualMenu>
          ) : null}
          {hasActiveFilter ? (
            <button
              type="button"
              className="control"
              aria-label="Reset filters"
              onClick={() => onFiltersChange?.({})}
            >
              <Icon icon="restart" />
              <span className="label">Reset</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Sort; the label states the current order */}
      {showSorting && sortOrder && onSortOrderChange ? (
        <button
          type="button"
          className="control"
          aria-label={sortOrder === "newest" ? "Latest" : "Earliest"}
          onClick={() =>
            onSortOrderChange(sortOrder === "newest" ? "oldest" : "newest")
          }
        >
          <Icon icon={sortOrder === "newest" ? "arrow-down" : "arrow-up"} />
          <span className="label">
            {sortOrder === "newest" ? "Latest" : "Earliest"}
          </span>
        </button>
      ) : null}
    </div>
  );
};

Header.displayName = "Timeline.Header";

export default Header;
