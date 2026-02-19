import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./Example.js";

const meta = {
  title: "Web Components/Example",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => html`<my-element></my-element>`,
};
