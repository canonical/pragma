import type { Meta, StoryObj } from "@storybook/react";

import { SHOWCASE_EXAMPLES } from "../examples/examples.js";
import { ConfigProvider } from "./Context.js";
import Component from "./ExampleControls.js";

const meta = {
  title: "ExampleControls",
  component: Component,
  decorators: [
    (Story) => (
      <ConfigProvider examples={SHOWCASE_EXAMPLES}>
        <Story />
      </ConfigProvider>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
