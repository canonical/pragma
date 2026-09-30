import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "../../../storybook/decorators.js";
import Component from "./Tile.js";

const meta = {
  title: "components/Tile",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default tile with a header and content.
 */
export const Default: Story = {
  args: {
    children: [
      <Component.Header key="header">
        <h4>Tile header</h4>
      </Component.Header>,
      <Component.Content key="content">
        <p className="p">This is the tile content area.</p>
      </Component.Content>,
    ],
  },
};

/**
 * A tile with content only (the header is optional).
 */
export const ContentOnly: Story = {
  args: {
    children: (
      <Component.Content>
        <p className="p">
          A tile can hold content without a header — useful for a single metric
          or a block of rich media.
        </p>
      </Component.Content>
    ),
  },
};

/**
 * The Tile always provides a surface, so its background steps as it is nested
 * inside successive `.surface` contexts (surface 1 -> 2 -> 3) — it stands out
 * from whatever it sits on, unlike the Card which blends in.
 */
export const OnSurfaces: Story = {
  parameters: { grid: "responsive" },
  // `render` builds its own tiles; args are unused but the type requires them.
  args: { children: <Component.Content>—</Component.Content> },
  render: () =>
    // The tile provides its own surface, so its background steps a level above
    // whatever band it sits on — it stands out rather than blending in.
    decorators.surfaces((level) => (
      <Component>
        <Component.Header>
          <h4>On surface level {level + 1}</h4>
        </Component.Header>
        <Component.Content>
          <p className="p">The tile background steps above its container.</p>
        </Component.Content>
      </Component>
    )),
};
