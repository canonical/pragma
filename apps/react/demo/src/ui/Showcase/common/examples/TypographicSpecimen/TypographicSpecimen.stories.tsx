import type { Meta, StoryObj } from "@storybook/react";

import Component from "./TypographicSpecimen.js";

const meta = {
  title: "Typographic Specimen",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
