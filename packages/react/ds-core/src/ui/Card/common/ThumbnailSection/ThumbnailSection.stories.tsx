/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./ThumbnailSection.js";

const meta = {
  title: "Card/ThumbnailSection",
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          "`Card.ThumbnailSection` is used for small images within cards. It uses the `Card.Section` component to display the thumbnail with appropriate spacing and borders.<br><br>Any valid HTML image attribute can be passed to `Card.ThumbnailSection`; the props shown below are the most commonly used, for your convenience.",
      },
    },
  },
  argTypes: {
    imageProps: {
      description:
        "Props for the image element. Be sure to also include a meaningful `alt` for accessibility.",
      control: { type: "object" },
      table: {
        type: {
          summary: "ImgHTMLAttributes<HTMLImageElement>",
        },
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    imageProps: {
      src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
      alt: "Raspberry Pi Logo",
    },
  },
};
