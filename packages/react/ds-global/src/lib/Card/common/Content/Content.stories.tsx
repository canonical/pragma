/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryFn } from "@storybook/react-vite";
import Component from "./Content.js";

const meta = {
  title: "Stable/Card/Content",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Content to display in the content area",
    },
    className: {
      control: { type: "text" },
      description: "Additional CSS classes",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "`Card.Content` is the main content area within a Card, providing the default slot for card content.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

export const Default: StoryFn<typeof Component> = (props) => (
  <Component {...props}>
    <h3>Card content</h3>
    <p>This is the main content area of the card.</p>
    <ul>
      <li>First item</li>
      <li>Second item</li>
      <li>Third item</li>
    </ul>
  </Component>
);
