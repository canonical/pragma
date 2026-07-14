import type { Decorator, Meta, StoryFn } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import * as decorators from "../../../storybook/decorators.js";
import { Chip } from "../Chip/index.js";
import Component from "./Card.js";
import type { CardProps } from "./types.js";

/**
 * A single Card needs a grid parent (it is a subgrid). Wrap it in a centred,
 * one-column grid with a clamped, comfortable width so a lone card reads well.
 * `align-content: start` keeps the card at its intrinsic height (the grid does
 * not stretch it to fill the preview). Applied per single-card story (not meta),
 * so surface/grid stories that bring their own layout are unaffected.
 */
const centeredCard: Decorator = (Story) => (
  <div
    className="grid"
    style={
      {
        "--modifier-grid-template": "minmax(0, 22rem)",
        justifyContent: "center",
        alignContent: "start",
      } as CSSProperties
    }
  >
    <Story />
  </div>
);

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
  <Component {...props}>
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
Default.decorators = [centeredCard];

/**
 * A full-bleed image above the content block.
 *
 * `Card.Image` is not part of the core API.
 */
export const WithImage: StoryFn<CardProps> = (props) => (
  <Component {...props}>
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
WithImage.decorators = [centeredCard];

/**
 * A card with a header, content and footer. Only the content-bearing sections
 * pad themselves; the card frame applies no general padding and the image
 * bleeds edge to edge. The header is not a separate visual section: no divider
 * is drawn under it and it merges with the content below, so title and body
 * read as one region. The footer holds tags and labels, not actions — CTAs
 * belong in `Card.Content`.
 *
 * `Card.Header`, `Card.Image` and `Card.Footer` are **not core API** — the base
 * card is just `Card.Content`; these are optional sections layered on top.
 */
export const HeaderContentFooter: StoryFn<CardProps> = (props) => (
  <Component {...props}>
    <Component.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" />
    <Component.Header>
      <h4>Ubuntu 24.04 LTS</h4>
      <span className="p">Noble Numbat</span>
    </Component.Header>
    <Component.Content>
      <p className="p">
        The latest long-term support release, with ten years of security
        maintenance and a refreshed toolchain for developers and operators.{" "}
        <a href="https://ubuntu.com/download">Download</a> or read the{" "}
        <a href="https://ubuntu.com/blog">release notes</a>.
      </p>
    </Component.Content>
    <Component.Footer>
      <Chip value="LTS" />
      <Chip value="Desktop" />
      <Chip value="Server" />
    </Component.Footer>
  </Component>
);
HeaderContentFooter.decorators = [centeredCard];

/* NOTE: the old `GridLayout` story (a grid of cards) has moved to the dedicated
 * `Cards` group component (`groups/Cards`), which lays cards out on a shared
 * subgrid so their sections align across the row. See `lib/group/Cards`. */

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
OnSurfaces.parameters = { grid: "responsive" };
