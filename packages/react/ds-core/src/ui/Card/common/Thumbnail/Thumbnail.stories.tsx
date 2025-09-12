/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Thumbnail.js";

const meta = {
  title: "Card/Thumbnail",
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
          "`Card.Thumbnail` is used for small images within cards. It uses the `Card.Section` component to display the thumbnail with appropriate spacing and borders.<br><br>Any valid HTML image attribute can be passed to `Card.Thumbnail`; the props shown below are the most commonly used, for your convenience.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
    alt: "Raspberry Pi Logo",
  },
};
