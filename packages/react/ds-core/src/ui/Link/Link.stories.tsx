/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Link.js";

const meta = {
  title: "Link",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: "https://ubuntu.com",
    children: "Get started with Ubuntu",
  },
};

export const Soft: Story = {
  args: {
    ...Default.args,
    appearance: "soft",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Soft links appear as default text until interacted with. These are often used when many links are grouped together, such as in a link cloud.",
      },
    },
  },
};

export const InlineContents: Story = {
  args: {
    ...Soft.args,
    //   TODO make this an anchor link Icon after implementation of Icon component https://vanillaframework.io/docs/patterns/links#anchor-link
    activationContents: "+",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Links can also display inline content when hovered. This can be used to indicate something particular about a link action (i.e., will open in a new tab, will copy a URL, etc).",
      },
    },
  },
};
