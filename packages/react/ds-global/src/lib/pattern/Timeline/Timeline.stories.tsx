import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  anatomyFormats,
  anatomyItems,
  combinationItems,
  mergeProposal,
} from "../../../storybook/timeline/fixtures.js";
import Component from "./Timeline.js";

const meta = {
  title: "patterns/Timeline",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          '`markerCombination` sets how marker sizes are derived from the events: `"all-sizes"` (the default) gives a large marker to the first event of each sequence of consecutive events from the same actor, then — within each run\'s remaining events — a medium marker to the first event of each sequence of the same event type, and small markers to the rest. `"large-medium"`, `"large-small"` and `"medium-small"` apply two sizes by actor runs; `"large"`, `"medium"` and `"small"` apply one size to every event.<br><br>Sizes are derived from the visible (filtered and sorted) list, so filtering re-derives them: filter out the first event of an actor\'s sequence and the next one takes the large marker. To override the derived size on a single event, set `marker.size` (`"large"` | `"medium"` | `"small"`) on that item — it wins over the combination for that event; omit it and the combination applies.',
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * Figma reference: the Launchpad merge-proposal example ("Timeline 🟢
 * Anatomy | 🔴 Styles" in the documentation visuals). The fixtures module
 * reproduces its content with story-local stand-ins.
 */

/** Header controls, the default all-sizes marker progression, a 42-event
 * collapse in the middle, and custom content per event. */
export const MergeProposal: Story = {
  args: { ...mergeProposal },
};

/** The anatomy reference: plain events, expansion indicator at the bottom. */
export const AnatomyDefault: Story = {
  args: {
    items: anatomyItems,
    label: "Timeline anatomy",
    expansion: { method: "bottom", initialVisible: 4, step: 2 },
    dateTimeFormats: anatomyFormats,
  },
};

/** The alternative layout: the dateTime in its own column, left of the marker. */
export const LeadingLayout: Story = {
  args: {
    items: anatomyItems,
    label: "Timeline, leading dateTime",
    dateTimePosition: "leading",
    expansion: false,
    dateTimeFormats: anatomyFormats,
  },
};

/** The default combination: large per actor run, medium per type run within
 * it, small for the rest. */
export const MarkerCombinations: Story = {
  args: {
    items: combinationItems,
    label: "Marker combinations",
    showControls: false,
    expansion: false,
  },
};

/** The "large-small" combination: large per actor run, small for the rest. */
export const MarkerCombinationsLargeSmall: Story = {
  args: {
    ...MarkerCombinations.args,
    markerCombination: "large-small",
  },
};

/** The "medium-small" combination: medium per actor run, small for the rest. */
export const MarkerCombinationsMediumSmall: Story = {
  args: {
    ...MarkerCombinations.args,
    markerCombination: "medium-small",
  },
};
