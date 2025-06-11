/* @canonical/generator-ds 0.9.0-experimental.4 */

import { Temporal } from "@js-temporal/polyfill";
import type { Meta, StoryFn } from "@storybook/react-vite";
import Component from "./RelativeTime.js";

const meta = {
  title: "RelativeTime",
  tags: ["autodocs"],
  component: Component,
  parameters: {
    // this component has no visual representation, so we disable snapshot testing
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof Component>;

export default meta;

export const Now: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();

  return <Component {...args} time={instant} />;
};

export const FewSecondsAgo: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const fewSecondsAgo = instant.subtract({ seconds: 15 });

  return <Component {...args} time={fewSecondsAgo} />;
};

export const TwoMinutesAgo: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const twoMinutesAgo = instant.subtract({ minutes: 2 });

  return <Component {...args} time={twoMinutesAgo} />;
};

export const TwoHoursAgo: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const twoHoursAgo = instant.subtract({ hours: 2 });

  return <Component {...args} time={twoHoursAgo} />;
};

export const TwoDaysAgo: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const twoDaysAgo = instant.subtract({ hours: 24 * 2 });

  return <Component {...args} time={twoDaysAgo} />;
};

export const InTwoDays: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const inTwoDays = instant.add({ hours: 24 * 2 });

  return <Component {...args} time={inTwoDays} />;
};

export const FiveMonthsAgo: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const fiveMonthsAgo = instant.subtract({ hours: 24 * 30 * 5 });

  return <Component {...args} time={fiveMonthsAgo} />;
};

export const InFiveMonths: StoryFn<typeof meta> = (args) => {
  const instant = Temporal.Now.instant();
  const inFiveMonths = instant.add({ hours: 24 * 30 * 5 });

  return <Component {...args} time={inFiveMonths} />;
};

export const InvalidTime: StoryFn<typeof meta> = (args) => {
  const invalidTime = "invalid time";

  return <Component {...args} time={invalidTime} />;
};
