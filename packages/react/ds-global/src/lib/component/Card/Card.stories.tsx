import type { Meta, StoryFn } from "@storybook/react-vite";
import * as decorators from "../../../storybook/decorators.js";
import Component from "./Card.js";
import type { CardProps } from "./types.js";

const meta = {
  title: "_work_in_progress/component/Card",
  component: Component,
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;

/**
 * A typical blog-style card: a full-bleed image above a padded content block.
 */
export const Default: StoryFn<CardProps> = (props) => (
  <Component {...props} style={{ maxWidth: "24rem" }}>
    <Component.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" />
    <Component.Content>
      <h3>Build a bare-metal cloud on a Raspberry Pi cluster with MAAS</h3>
      <p className="p">
        The Raspberry Pi 4, with its fast CPU cores, up to 8 GB of RAM and tiny
        footprint, is a great option to run a cluster on. Provisioning is easy
        with <a href="https://maas.io">MAAS</a>.
      </p>
    </Component.Content>
  </Component>
);

/**
 * A card with a header, content and footer. Only the content-bearing sections
 * pad themselves; the card frame applies no general padding and the image
 * bleeds edge to edge. Dividers separate adjacent sections.
 */
export const HeaderContentFooter: StoryFn<CardProps> = (props) => (
  <Component {...props} style={{ maxWidth: "24rem" }}>
    <Component.Header>
      <h3>Ubuntu 24.04 LTS</h3>
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
 * A compact horizontal card: a fixed-size thumbnail beside a title and excerpt,
 * as used in blog sidebars and related-content lists.
 */
export const WithThumbnail: StoryFn<CardProps> = (props) => (
  <Component {...props} style={{ maxWidth: "28rem" }}>
    <Component.Thumbnail
      imageProps={{
        src: "https://assets.ubuntu.com/v1/31bd2627-logo-raspberry-pi.svg",
        alt: "Raspberry Pi logo",
      }}
    >
      <h3>Ubuntu Core on Raspberry Pi</h3>
      <p className="p">
        A secure, transactional OS for IoT devices. Ubuntu Core supports both
        the Pi 2 and Pi 3, with confined snaps and automatic updates.
      </p>
    </Component.Thumbnail>
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
        <h3>MAAS</h3>
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
        <h3>Juju</h3>
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
        <h3>Landscape</h3>
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
 * The Card establishes its own `.surface`, so its background steps as it is
 * nested inside successive `.surface` contexts (surface 1 -> 2 -> 3). The
 * wrappers set an explicit background from the matching layer token because
 * `.surface` re-channels foreground tokens but sets no background of its own.
 */
export const OnSurfaces: StoryFn<CardProps> = () => {
  const card = (
    <Component>
      <Component.Content>
        <h3>Placeholder content</h3>
        <p className="p">The card background steps with the surface level.</p>
      </Component.Content>
    </Component>
  );

  return (
    <div style={{ display: "grid", gap: "var(--dimension-300)" }}>
      <div
        className="surface"
        style={{
          padding: "var(--dimension-200)",
          background: "var(--color-background)",
        }}
      >
        {card}
        <div
          className="surface"
          style={{
            marginBlockStart: "var(--dimension-200)",
            padding: "var(--dimension-200)",
            background: "var(--color-background-layer2)",
          }}
        >
          {card}
          <div
            className="surface"
            style={{
              marginBlockStart: "var(--dimension-200)",
              padding: "var(--dimension-200)",
              background: "var(--color-background-layer3)",
            }}
          >
            {card}
          </div>
        </div>
      </div>
    </div>
  );
};
