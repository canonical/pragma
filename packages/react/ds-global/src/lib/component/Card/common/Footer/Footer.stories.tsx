import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "../../../Chip/index.js";
import Component from "./Footer.js";

const meta = {
  title: "components/Card/Footer",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description:
        "Footer content (required): tags and labels (e.g. `Chip`), not CTAs or links.",
    },
  },
  decorators: [
    (Story) => (
      <div className="ds card surface" style={{ maxWidth: "400px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Card footer",
  },
};

/**
 * The intended footer content: tags and labels flowing in a wrapping row.
 */
export const Tags: Story = {
  args: {
    children: (
      <>
        <Chip value="LTS" />
        <Chip value="Desktop" />
        <Chip value="Server" />
      </>
    ),
  },
};
