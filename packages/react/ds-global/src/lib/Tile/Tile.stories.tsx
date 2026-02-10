import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Component from "./Tile.js";
import Tile from "./Tile.js";

const meta = {
  title: "Beta/Tile",
  component: Component,
  tags: ["autodocs"],
  args: { onClick: fn() },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default tile with header and content.
 */
export const Default: Story = {
  args: {
    children: [
      <Tile.Header key="header">Tile Header</Tile.Header>,
      <Tile.Content key="content">
        <p>This is the tile content area.</p>
      </Tile.Content>,
    ],
  },
};

/**
 * Tile with rich content including formatted text.
 */
export const WithRichContent: Story = {
  args: {
    children: [
      <Tile.Header key="header">Product Details</Tile.Header>,
      <Tile.Content key="content">
        <p>
          <strong>Price:</strong> $99.00
        </p>
        <p>
          <strong>Availability:</strong> In Stock
        </p>
        <p>A high-quality product with excellent features.</p>
      </Tile.Content>,
    ],
  },
};

/**
 * Multiple tiles displayed in a grid layout.
 */
export const MultipleInGrid: Story = {
  decorators: [
    () => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        <Tile>
          <Tile.Header>Tile 1</Tile.Header>
          <Tile.Content>Content for tile 1</Tile.Content>
        </Tile>
        <Tile>
          <Tile.Header>Tile 2</Tile.Header>
          <Tile.Content>Content for tile 2</Tile.Content>
        </Tile>
        <Tile>
          <Tile.Header>Tile 3</Tile.Header>
          <Tile.Content>Content for tile 3</Tile.Content>
        </Tile>
      </div>
    ),
  ],
  args: {
    children: [
      <Tile.Header key="header">Placeholder</Tile.Header>,
      <Tile.Content key="content">Placeholder</Tile.Content>,
    ],
  },
};

/**
 * Interactive tile that responds to click and keyboard events.
 */
export const Clickable: Story = {
  args: {
    children: [
      <Tile.Header key="header">Clickable Tile</Tile.Header>,
      <Tile.Content key="content">
        Click or press Enter to interact
      </Tile.Content>,
    ],
    role: "button",
    tabIndex: 0,
  },
};
