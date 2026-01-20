/* @canonical/generator-ds 0.10.0-experimental.2 */

import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import * as decorators from "../../storybook/decorators.js";
import Component from "./Card.js";
import type { CardProps } from "./types.js";

const meta = {
  title: "In Progress/Card",
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
          "A `Card` component with subcomponents for different content types. `Card.Content` is the main content area within a card. `Card.ThumbnailSection` embeds a small image with content. `Card.Image` displays a full-width image.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: StoryFn<CardProps> = (props) => (
  <Component {...props}>
    <Component.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" />
    <Component.Content>
      <h3>
        Build your own bare metal cloud using a Raspberry Pi cluster with MAAS{" "}
      </h3>
      <p>Duration: 1:00</p>
      <p>
        The Raspberry Pi 4 (RPi) with it's relatively fast CPU cores, up to 8 GB
        of RAM, and tiny physical footprint presents a great option to run a
        cluster on. Provisioning all those RPis can be a pain however, and
        people have wanted to use tools like <a href="https://maas.io">MAAS</a>.
      </p>
    </Component.Content>
  </Component>
);

export const Highlighted: Story = {
  args: {
    emphasis: "highlighted",
    children: (
      <Component.Content>
        <h3>Highlighted Card</h3>
        <p>This card has highlighted emphasis applied to the entire card.</p>
      </Component.Content>
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
    <Component.Content>
      <h3>Raspberry Pi2 and Pi3</h3>
      <p>
        For fun, for education and for profit, the RPi makes device development
        personal and entertaining. With support for both the Pi2 and the new
        Pi3, Ubuntu Core supports the world's most beloved board.
      </p>
    </Component.Content>
  </Component>
);

WithThumbnailSection.parameters = {
  docs: {
    description: {
      story: "A Card with a ThumbnailSection image at the top.",
    },
  },
};

export const GridLayout: StoryFn<CardProps> = () => (
  <>
    <Component>
      <Component.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" />
      <Component.Content>
        <h3>Raspberry Pi Cluster with MAAS</h3>
        <p>
          Build your own bare metal cloud using a Raspberry Pi cluster with
          MAAS. The RPi 4 presents a great option to run a cluster on.
        </p>
      </Component.Content>
    </Component>
    <Component emphasis="highlighted">
      <Component.ThumbnailSection
        imageProps={{
          src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
          alt: "Raspberry Pi Logo",
        }}
      />
      <Component.Content>
        <h3>Raspberry Pi2 and Pi3</h3>
        <p>
          For fun, for education and for profit, the RPi makes device
          development personal and entertaining. Ubuntu Core supports the Pi2
          and Pi3.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
          risus.
        </p>
      </Component.Content>
    </Component>
    <Component>
      <Component.Content>
        <h3>Ubuntu Server</h3>
        <p>
          Ubuntu Server brings economic and technical scalability to your
          datacenter, public or private. Whether you want to deploy an OpenStack
          cloud, a Kubernetes cluster or a 50,000-node render farm, Ubuntu
          Server delivers the best value scale-out performance available.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non
          risus.
        </p>
      </Component.Content>
    </Component>
    <Component>
      <Component.ThumbnailSection
        imageProps={{
          src: "https://assets.ubuntu.com/v1/2d850f3f-CoF%2520Circle%2520New.svg",
          alt: "Ubuntu logo",
        }}
      />
      <Component.Content>
        <h3>Ubuntu Desktop</h3>
        <p>
          Ubuntu Desktop is the modern, open source desktop operating system for
          millions of PC and laptop users around the world.
        </p>
      </Component.Content>
    </Component>
    <Component emphasis="highlighted">
      <Component.Content>
        <h3>Canonical Kubernetes</h3>
        <p>
          Multi-cloud Kubernetes operations, simplified. Deploy and operate
          consistently on AWS, Azure, Google Cloud, Oracle, OpenStack, VMware,
          bare metal and edge.
        </p>
      </Component.Content>
    </Component>
    <Component>
      <Component.ThumbnailSection
        imageProps={{
          src: "https://assets.ubuntu.com/v1/ac1c88fd-juju_logo.png",
          alt: "Juju logo",
        }}
      />
      <Component.Content>
        <h3>Juju</h3>
        <p>
          Juju is an open source application modelling tool. Deploy, configure,
          scale and operate your software on public and private clouds.
        </p>
      </Component.Content>
    </Component>
  </>
);

GridLayout.decorators = [decorators.grid()];

GridLayout.parameters = {
  docs: {
    description: {
      story:
        "Wrap cards in a grid to ensure adjacent cards are evenly sized and spaced.",
    },
  },
};
