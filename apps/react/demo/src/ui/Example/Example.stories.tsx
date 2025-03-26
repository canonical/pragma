import type { Meta, StoryObj } from "@storybook/react";
import { SHOWCASE_EXAMPLES } from "../../data/index.js";
import { Example } from "./index.js";

const meta = {
  title: "Example",
  component: Example,
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: SHOWCASE_EXAMPLES,
    children: (
      <div>
        <Example.Renderer />
        <Example.Controls />
      </div>
    ),
  },
};
