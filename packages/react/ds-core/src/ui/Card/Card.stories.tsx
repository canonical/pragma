/* @canonical/generator-ds 0.10.0-experimental.2 */

import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import Component from "./Card.js";
import type { CardProps } from "./types.js";

const meta = {
  title: "Card/Card",
  component: Component,
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Content to display in the card.",
    },
    emphasis: {
      options: MODIFIER_FAMILIES.emphasis,
      control: { type: "radio" },
      description:
        "Emphasis modifier for the card.<br><br>Note: currently, only 'neutral' and 'highlighted' are supported; support for other modifiers is forthcoming.",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A `Card` component with subcomponents for different content types. `Card.Section` is a helper for grouping flexible content within a card, providing padding and border separation. `Card.ThumbnailSection` is a `Card.Section` that embeds a small image. `Card.Image` displays a full-width image.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryFn<CardProps> = (props) => (
  <Component {...props}>
    <Component.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" />
    <Component.Section>
      <h3>
        Build your own bare metal cloud using a Raspberry Pi cluster with MAAS{" "}
      </h3>
      <p>Duration: 1:00</p>
    </Component.Section>
    <Component.Section>
      <p>
        The Raspberry Pi 4 (RPi) with it’s relatively fast CPU cores, up to 8 GB
        of RAM, and tiny physical footprint presents a great option to run a
        cluster on. Provisioning all those RPis can be a pain however, and
        people have wanted to use tools like <a href="https://maas.io">MAAS</a>.
      </p>
    </Component.Section>
  </Component>
);

export const Highlighted: Story = {
  args: {
    emphasis: "highlighted",
    children: (
      <Component.Section>
        <h3>Highlighted Card</h3>
        <p>This card has highlighted emphasis applied to the entire card.</p>
      </Component.Section>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Apply the highlighted emphasis modifier to a card to further contrast it from surrounding content. This is especially useful when the card contains interactive content.",
      },
    },
  },
};

export const WithThumbnailSection: StoryFn<CardProps> = (props) => (
  <Component {...props}>
    <Component.ThumbnailSection
      imageProps={{
        src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
        alt: "Raspberry Pi Logo",
      }}
    />
    <Component.Section>
      <h3>Raspberry Pi2 and Pi3</h3>
      <p>
        For fun, for education and for profit, the RPi makes device development
        personal and entertaining. With support for both the Pi2 and the new
        Pi3, Ubuntu Core supports the world’s most beloved board.
      </p>
    </Component.Section>
  </Component>
);

WithThumbnailSection.parameters = {
  docs: {
    description: {
      story: "A Card with a ThumbnailSection image at the top.",
    },
  },
};
