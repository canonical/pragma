import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Spinner.js";

const meta = {
  title: "subcomponents/Spinner",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "An indeterminate activity indicator: the `spinner` icon rotating continuously. It is decorative by default (`aria-hidden`); pass an `aria-label` when the spinner is the only signal that work is in progress, so it is announced as a named image. Inside a control that already announces its busy state (e.g. a submitting Button), leave it decorative.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default spinner. It is decorative unless labelled — set `aria-label`
 * (shown here) to expose it as a named image for standalone loading states.
 */
export const Default: Story = {
  args: {
    "aria-label": "Loading",
  },
};

/**
 * The spinner scales with the `font-size` of its container (like any icon), so
 * it lines up with adjacent text. Override `--spinner-size` to resize directly.
 */
export const Sized: Story = {
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <span style={{ fontSize: "1rem" }}>
        <Component {...args} />
      </span>
      <span style={{ fontSize: "1.5rem" }}>
        <Component {...args} />
      </span>
      <span style={{ fontSize: "2rem" }}>
        <Component {...args} />
      </span>
    </div>
  ),
};
