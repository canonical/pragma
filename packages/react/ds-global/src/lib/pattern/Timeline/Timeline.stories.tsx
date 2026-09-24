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
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * Figma reference: the Launchpad merge-proposal example ("Timeline 🟢
 * Anatomy | 🔴 Styles" in the documentation visuals). The fixtures module
 * reproduces its content with story-local stand-ins.
 */

/** Header controls, the all-sizes marker progression, a 42-event collapse in
 * the middle, and custom content per event. */
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

/** Large per actor run, medium per type run, small for the rest. */
export const MarkerCombinations: Story = {
  args: {
    items: combinationItems,
    label: "Marker combinations",
    showControls: false,
    expansion: false,
  },
};
