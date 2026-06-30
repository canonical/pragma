import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import { TimeField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/TimeField",
  component: TimeField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof TimeField>;

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

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({ name: "err_time", label: "Start time" });
