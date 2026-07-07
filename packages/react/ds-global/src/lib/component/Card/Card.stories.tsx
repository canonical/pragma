import type { Meta, StoryFn } from "@storybook/react-vite";
import * as decorators from "../../../storybook/decorators.js";
import Component from "./Card.js";
import type { CardProps } from "./types.js";

const meta = {
  title: "components/Card",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;

/**
 * The base card: a single padded content block. `Card.Content` is the core
 * API — the header, image, and footer shown in other stories are optional
 * extras, not part of the base card.
 */
export const Default: StoryFn<CardProps> = (props) => (
  <Component {...props} style={{ maxWidth: "24rem" }}>
    <Component.Content>
      <h4>Build a bare-metal cloud on a Raspberry Pi cluster with MAAS</h4>
      <p className="p">
        The Raspberry Pi 4, with its fast CPU cores, up to 8 GB of RAM and tiny
        footprint, is a great option to run a cluster on. Provisioning is easy
        with <a href="https://maas.io">MAAS</a>.
      </p>
    </Component.Content>
  </Component>
);

/**
 * A full-bleed image above the content block.
 *
 * `Card.Image` is not part of the core API.
 */
export const WithImage: StoryFn<CardProps> = (props) => (
  <Component {...props} style={{ maxWidth: "24rem" }}>
    <Component.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" />
    <Component.Content>
      <h4>Build a bare-metal cloud on a Raspberry Pi cluster with MAAS</h4>
      <p className="p">
        The Raspberry Pi 4 is a great option to run a cluster on, and
        provisioning is easy with <a href="https://maas.io">MAAS</a>.
      </p>
    </Component.Content>
  </Component>
);

/**
 * A card with a header, content and footer. Only the content-bearing sections
 * pad themselves; the card frame applies no general padding and the image
 * bleeds edge to edge. Dividers separate adjacent sections.
 *
 * `Card.Header`, `Card.Image` and `Card.Footer` are **not core API** — the base
 * card is just `Card.Content`; these are optional sections layered on top.
 */
export const HeaderContentFooter: StoryFn<CardProps> = (props) => (
  <Component {...props} style={{ maxWidth: "24rem" }}>
    <Component.Header>
      <h4>Ubuntu 24.04 LTS</h4>
      <span className="p">Noble Numbat</span>
    </Component.Header>
    <Component.Image src="https://assets.ubuntu.com/v1/08478b35-ubuntu-core-cybersecurity.png" />
    <Component.Content>
      <p className="p">
        The latest long-term support release, with ten years of security
        maintenance and a refreshed toolchain for developers and operators.
      </p>
    </Component.Content>
    <Component.Footer>
      <a href="https://ubuntu.com/download">Download</a>
      <a href="https://ubuntu.com/blog">Release notes</a>
    </Component.Footer>
  </Component>
);

/**
 * A grid of cards sharing the same structure, so attributes line up and can be
 * scanned across the set — the primary use case for cards over the flexible
 * Tile.
 */
export const GridLayout: StoryFn<CardProps> = () => (
  <>
    <Component>
      <Component.Image src="https://assets.ubuntu.com/v1/0aa26309-maas_banners_leaderboard.png" />
      <Component.Content>
        <h4>MAAS</h4>
        <p className="p">
          Self-service, remote installation of Windows, CentOS, ESXi and Ubuntu
          on real servers, turning your data centre into a bare-metal cloud.
        </p>
      </Component.Content>
      <Component.Footer>
        <a href="https://maas.io">maas.io</a>
      </Component.Footer>
    </Component>
    <Component>
      <Component.Image src="https://assets.ubuntu.com/v1/2c7e3fab-juju-header-illustration.svg" />
      <Component.Content>
        <h4>Juju</h4>
        <p className="p">
          An open-source orchestration engine for software operators that
          simplifies deployment, configuration and scaling of applications.
        </p>
      </Component.Content>
      <Component.Footer>
        <a href="https://juju.is">juju.is</a>
      </Component.Footer>
    </Component>
    <Component>
      <Component.Image src="https://assets.ubuntu.com/v1/20ace314-managed_services.png" />
      <Component.Content>
        <h4>Landscape</h4>
        <p className="p">
          Systems-management for Ubuntu estates: patching, compliance and
          monitoring across physical, virtual and cloud instances at scale.
        </p>
      </Component.Content>
      <Component.Footer>
        <a href="https://ubuntu.com/landscape">ubuntu.com/landscape</a>
      </Component.Footer>
    </Component>
  </>
);

GridLayout.decorators = [decorators.grid()];

/**
 * The Card is not a surface: it sets no background of its own, so on each
 * surface it takes the *same* background as its container and reads as flush —
 * delimited only by its border and radius. Placed on three different surface
 * levels, the card blends with each rather than stepping to the next layer.
 */
export const OnSurfaces: StoryFn<CardProps> = () =>
  // The card sets no background of its own, so it takes the same background as
  // the surface band it sits on and blends in (rather than stepping).
  decorators.surfaces((level) => (
    <Component>
      <Component.Content>
        <h4>On surface level {level + 1}</h4>
        <p className="p">
          The card takes the same background as the surface it sits on.
        </p>
      </Component.Content>
    </Component>
  ));
OnSurfaces.parameters = { grid: true };
