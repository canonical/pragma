import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/index.js";
import Popover from "./Popover.js";

const meta = {
  title: "Experimental/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "Popover content",
    children: <Button>Click to open</Button>,
  },
};

export const PreferBottom: Story = {
  args: {
    content: "Positioned below the trigger",
    preferredDirections: ["bottom"],
    children: <Button>Open below</Button>,
  },
};

export const RichContent: Story = {
  args: {
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <strong>Popover title</strong>
        <p style={{ margin: 0 }}>Some descriptive text inside the popover.</p>
        <Button>Action</Button>
      </div>
    ),
    children: <Button>Rich popover</Button>,
  },
};
