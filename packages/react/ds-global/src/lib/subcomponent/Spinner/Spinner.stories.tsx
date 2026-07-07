import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Spinner.js";

const meta = {
  title: "subcomponents/Spinner",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sized: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The spinner is sized relative to the `font-size` of its container, like any icon.",
      },
    },
  },
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <span style={{ fontSize: "1rem" }}>
        <Component {...args} />
      </span>
      <span style={{ fontSize: "2rem" }}>
        <Component {...args} />
      </span>
      <span style={{ fontSize: "3rem" }}>
        <Component {...args} />
      </span>
    </div>
  ),
};

export const Labelled: Story = {
  args: {
    "aria-label": "Loading",
  },
  parameters: {
    docs: {
      description: {
        story:
          "When the spinner is the only indication that work is in progress, give it an `aria-label` so it is announced as a named image. Inside a control that already announces its busy state, leave it decorative (the default).",
      },
    },
  },
};
