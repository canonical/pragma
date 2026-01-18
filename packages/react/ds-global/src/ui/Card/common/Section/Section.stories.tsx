/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import Component from "./Section.js";

const meta = {
  title: "Card/Section",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: { type: "text" },
      description: "Content to display in the section",
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
          "`Card.Section` is used to pad content sections within cards.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: StoryFn<typeof Component> = (props) => (
  <Component {...props}>
    <h3>Card section</h3>
    <ul>
      <li>First item</li>
      <li>Second item</li>
      <li>Third item</li>
    </ul>
  </Component>
);
