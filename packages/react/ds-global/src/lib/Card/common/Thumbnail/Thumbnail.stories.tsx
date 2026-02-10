/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Thumbnail.js";

const meta = {
  title: "Stable/Card/Thumbnail",
  component: Component,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`Card.Thumbnail` displays a small thumbnail image within a card, typically used alongside content for logo/icon representation. Implements `ds:global.subcomponent.card-thumbnail`.",
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
    children: {
      description: "Optional content to display alongside the thumbnail image.",
      control: { type: "text" },
    },
  },
  decorators: [
    (Story) => (
      <div
        className="ds card"
        style={{ maxWidth: "400px", border: "1px solid #e5e5e5" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default thumbnail with image only.
 */
export const Default: Story = {
  args: {
    imageProps: {
      src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
      alt: "Raspberry Pi Logo",
    },
  },
};

/**
 * Thumbnail with image and content.
 */
export const WithContent: Story = {
  args: {
    imageProps: {
      src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
      alt: "Raspberry Pi Logo",
    },
    children: (
      <>
        <h3>Raspberry Pi</h3>
        <p>The world's most beloved single-board computer.</p>
      </>
    ),
  },
};
