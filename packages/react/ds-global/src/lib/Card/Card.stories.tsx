import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import * as decorators from "../../storybook/decorators.js";
import Component from "./Card.js";
import type { CardProps } from "./types.js";

const meta = {
  title: "Stable/Card",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Content to display in the card.",
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
    <Component>
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
      </Component.Content>
    </Component>
  </>
);

GridLayout.decorators = [decorators.grid()];
