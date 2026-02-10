/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Image.js";

const meta = {
  title: "Stable/Card/Image",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    src: {
      control: { type: "text" },
      description: "Image source URL",
    },
    alt: {
      control: { type: "text" },
      description: "Alternative text for the image",
    },
    className: {
      control: { type: "text" },
      description: "Additional CSS classes",
    },
    width: {
      control: { type: "number" },
      description: "Image width",
    },
    height: {
      control: { type: "number" },
      description: "Image height",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "`Card.Image` is used for images that span the width of the card.<br><br>Any valid HTML image attribute can be passed to `Card.Image`; the props shown below are the most commonly used, for your convenience.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://assets.ubuntu.com/v1/5ce214a4-rpi.png",
  },
};
