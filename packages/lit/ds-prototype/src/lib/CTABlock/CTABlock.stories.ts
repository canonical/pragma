import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./CTABlock.js";
import type CTABlock from "./CTABlock.js";

const meta = {
  title: "Web Components/CTABlock",
  tags: ["autodocs"],
  render: (args) => html`
    <ds-cta-block
      .primary=${args.primary}
      .secondaries=${args.secondaries}
      .link=${args.link}
    ></ds-cta-block>
  `,
} satisfies Meta<CTABlock>;

export default meta;
type Story = StoryObj<CTABlock>;

export const Default: Story = {
  args: {
    primary: { content_html: "Get started for free", attrs: { href: "#" } },
    secondaries: [{ content_html: "Read the docs", attrs: { href: "#" } }],
    link: {
      content_html: "Learn more about pricing &rsaquo;",
      attrs: { href: "#" },
    },
  },
};

export const PrimaryOnly: Story = {
  args: {
    primary: { content_html: "Download now", attrs: { href: "#" } },
  },
};

export const PrimaryAndLink: Story = {
  args: {
    primary: { content_html: "Get started", attrs: { href: "#" } },
    link: { content_html: "Learn more &rsaquo;", attrs: { href: "#" } },
  },
};
