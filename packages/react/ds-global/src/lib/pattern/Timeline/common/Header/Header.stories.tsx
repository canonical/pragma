import type { Meta, StoryFn } from "@storybook/react-vite";
import { useState } from "react";
import {
  actorFilterOptions,
  eventFilterOptions,
} from "../../../../../storybook/timeline/fixtures.js";
import type { TimelineFilterState, TimelineSortOrder } from "../../types.js";
import Component from "./Header.js";

const meta = {
  title: "patterns/Timeline/Header",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "`Timeline.Header` is the control bar for filtering and sorting the timeline. The sort button label states the current order; the reset button appears only when a filter is active.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * The control bar with the actor and event filter options inferred from
 * the merge-proposal fixtures.
 */
export const Default: StoryFn<typeof Component> = () => {
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>("newest");
  const [filters, setFilters] = useState<TimelineFilterState>({});
  return (
    <Component
      actorOptions={actorFilterOptions}
      eventOptions={eventFilterOptions}
      filters={filters}
      onFiltersChange={setFilters}
      sortOrder={sortOrder}
      onSortOrderChange={setSortOrder}
    />
  );
};

/**
 * An active filter reveals the reset control.
 */
export const WithActiveFilter: StoryFn<typeof Component> = () => {
  const [filters, setFilters] = useState<TimelineFilterState>({
    actorId: "alvarez",
  });
  return (
    <Component
      actorOptions={actorFilterOptions}
      eventOptions={eventFilterOptions}
      filters={filters}
      onFiltersChange={setFilters}
      sortOrder="newest"
      onSortOrderChange={() => {}}
    />
  );
};

/**
 * Custom trigger labels and a subset of controls.
 */
export const CustomisedControls: StoryFn<typeof Component> = () => (
  <Component
    actorOptions={actorFilterOptions}
    eventOptions={eventFilterOptions}
    showEventFilter={false}
    showSorting={false}
    actorFilterLabel="Author"
  />
);
