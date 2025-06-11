/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./Hidden.js";

const meta = {
  title: "Field/inputs/Hidden",
  component: Component,
  decorators: [
    decorators.form({
      defaultValues: {
        hidden_field: "hidden_value",
      },
    }),
  ],
  parameters: {
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "hidden_field",
  },
};
