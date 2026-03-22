import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./TimeInput.js";

const meta = {
  title: "Field/inputs/Time",
  component: Component,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "meeting_time",
    label: "Meeting time",
  },
};

export const WithStep: Story = {
  args: {
    name: "precise_time",
    label: "Time (15min steps)",
    step: 900,
  },
};

export const Disabled: Story = {
  args: {
    name: "time_disabled",
    label: "Time (disabled)",
    disabled: true,
  },
};
