import type { Meta, StoryFn } from "@storybook/react-vite";
import { useState } from "react";
import Component from "./ExpansionIndicator.js";

const meta = {
  title: "patterns/Timeline/ExpansionIndicator",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "`Timeline.ExpansionIndicator` summarises the hidden events with links to reveal more or all of them. The connector line passes through the rails above and below the bordered summary strip.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * The summary of hidden events with both reveal links. State tracks the
 * hidden count so the links act.
 */
export const Default: StoryFn<typeof Component> = () => {
  const [hiddenCount, setHiddenCount] = useState(42);
  return (
    <Component
      hiddenCount={hiddenCount}
      step={4}
      onShowMore={() => setHiddenCount((count) => Math.max(0, count - 4))}
      onShowAll={() => setHiddenCount(0)}
    />
  );
};

/**
 * Without `onShowAll`, only the "Show more" link renders.
 */
export const ShowMoreOnly: StoryFn<typeof Component> = () => (
  <Component hiddenCount={12} step={4} onShowMore={() => {}} />
);

/**
 * Without any handler, only the summary text renders.
 */
export const SummaryOnly: StoryFn<typeof Component> = () => (
  <Component hiddenCount={42} />
);
