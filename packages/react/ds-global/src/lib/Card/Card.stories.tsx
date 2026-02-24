import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import * as decorators from "../../storybook/decorators.js";
import Component from "./Card.js";
import type { CardEmphasis, CardProps } from "./types.js";

const CARD_EMPHASIS_OPTIONS: CardEmphasis[] = ["neutral", "highlighted"];

const meta = {
  title: "Stable/Card",
  component: Component,
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Content to display in the card.",
    },
    emphasis: {
      options: CARD_EMPHASIS_OPTIONS,
      control: { type: "radio" },
      description:
        "Emphasis modifier for the card. 'neutral' is the default; 'highlighted' provides increased visual prominence.",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A `Card` component with subcomponents for different content types. `Card.Header` provides title and actions, `Card.Content` is the main content area, `Card.Thumbnail` embeds a small image with optional content, and `Card.Image` displays a full-width image.",
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

export const WithThumbnail: StoryFn<CardProps> = (props) => (
  <Component {...props}>
    <Component.Thumbnail
      imageProps={{
        src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
        alt: "Raspberry Pi Logo",
      }}
    >
      <h3>Raspberry Pi2 and Pi3</h3>
      <p>
        For fun, for education and for profit, the RPi makes device development
        personal and entertaining. With support for both the Pi2 and the new
        Pi3, Ubuntu Core supports the world's most beloved board.
      </p>
    </Component.Thumbnail>
  </Component>
);

WithThumbnail.parameters = {
  docs: {
    description: {
      story: "A Card with a Thumbnail showing an image alongside content.",
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
      <Component.Thumbnail
        imageProps={{
          src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
          alt: "Raspberry Pi Logo",
        }}
      >
        <h3>Raspberry Pi2 and Pi3</h3>
        <p>
          For fun, for education and for profit, the RPi makes device
          development personal and entertaining. Ubuntu Core supports the Pi2
          and Pi3.
        </p>
      </Component.Thumbnail>
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
      <Component.Thumbnail
        imageProps={{
          src: "https://assets.ubuntu.com/v1/2d850f3f-CoF%2520Circle%2520New.svg",
          alt: "Ubuntu logo",
        }}
      >
        <h3>Ubuntu Desktop</h3>
        <p>
          Ubuntu Desktop is the modern, open source desktop operating system for
          millions of PC and laptop users around the world.
        </p>
      </Component.Thumbnail>
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
      <Component.Thumbnail
        imageProps={{
          src: "https://assets.ubuntu.com/v1/ac1c88fd-juju_logo.png",
          alt: "Juju logo",
        }}
      >
        <h3>Juju</h3>
        <p>
          Juju is an open source application modelling tool. Deploy, configure,
          scale and operate your software on public and private clouds.
        </p>
      </Component.Thumbnail>
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
