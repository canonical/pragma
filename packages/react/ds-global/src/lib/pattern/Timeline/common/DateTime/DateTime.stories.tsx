import type { Meta, StoryFn } from "@storybook/react-vite";
import { useState } from "react";
import { ago } from "../../../../../storybook/timeline/fixtures.js";
import Component from "./DateTime.js";

const meta = {
  title: "patterns/Timeline/DateTime",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "`Timeline.DateTime` displays when the event occurred. Hover shows the alternate format; the toggleable variant switches the format on click.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

/**
 * The static variant: a plain `<time>` with an alternate-format tooltip.
 * Labels from the merge-proposal fixtures.
 */
export const Static: StoryFn<typeof Component> = () => (
  <Component iso={ago(5)} alternate="Sep 11, 2026, 12:00 PM">
    5 days ago
  </Component>
);

/**
 * The toggleable variant: the root is a button; each click flips the
 * display between the relative and absolute formats.
 */
export const Toggleable: StoryFn<typeof Component> = () => {
  const [absolute, setAbsolute] = useState(false);
  return (
    <Component
      iso={ago(5)}
      alternate="Sep 11, 2026, 12:00 PM"
      toggleable
      onToggle={() => setAbsolute((value) => !value)}
    >
      {absolute ? "Sep 11, 2026, 12:00 PM" : "5 days ago"}
    </Component>
  );
};

/**
 * `showTooltip: false` drops the alternate-format tooltip.
 */
export const WithoutTooltip: StoryFn<typeof Component> = () => (
  <Component
    iso={ago(0, 4)}
    alternate="Sep 16, 2026, 8:00 AM"
    showTooltip={false}
  >
    4 hours ago
  </Component>
);
