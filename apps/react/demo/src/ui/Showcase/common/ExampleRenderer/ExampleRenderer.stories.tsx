import type { Meta, StoryObj } from "@storybook/react";

import { ConfigProvider } from "../ExampleControls/index.js";
import { SHOWCASE_EXAMPLES } from "../examples/examples.js";
import Component from "./ExampleRenderer.js";

const meta = {
  title: "ExampleRenderer",
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
