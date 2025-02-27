/* @canonical/generator-ds 0.9.0-experimental.4 */

import { Temporal } from "@js-temporal/polyfill";
import type { Meta, StoryFn } from "@storybook/react";
import Component from "./RelativeTime.js";

const meta = {
  title: "RelativeTime",
  tags: ["autodocs"],
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

export const Default: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const fewSecondsAgo = instant.subtract({ seconds: 15 });
  const twoMinutesAgo = instant.subtract({ minutes: 2 });
  const twoHoursAgo = instant.subtract({ hours: 2 });
  const twoDaysAgo = instant.subtract({ hours: 24 * 2 });
  const inTwoDays = instant.add({ hours: 24 * 2 });
  const fiveMonthsAgo = instant.subtract({ hours: 24 * 30 * 5 });
  const inFiveMonths = instant.add({ hours: 24 * 30 * 5 });

  const invalidTime = "invalid time";

  const dates = [
    instant,
    fewSecondsAgo,
    twoMinutesAgo,
    twoHoursAgo,
    twoDaysAgo,
    inTwoDays,
    fiveMonthsAgo,
    inFiveMonths,
    invalidTime,
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dates.map((date) => (
        <Component key={date.toString()} {...args} time={date} />
      ))}
    </div>
  );
};
