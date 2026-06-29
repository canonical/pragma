import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { TimeInputField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/TimeInputField",
  component: TimeInputField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof TimeInputField>;

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
