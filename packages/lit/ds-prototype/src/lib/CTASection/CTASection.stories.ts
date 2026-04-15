import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./CTASection.js";
import "../SiteLayout/SiteLayout.js";
import type CTASection from "./CTASection.js";

const meta = {
  title: "Web Components/CTASection",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (story) => html`
      <ds-site-layout>
        ${story()}
      </ds-site-layout>
    `,
  ],
  render: (args) => html`
    <ds-cta-section
      title-text="${args.titleText}"
      variant="${args.variant}"
      layout="${args.layout}"
      .blocks=${args.blocks}
    ></ds-cta-section>
  `,
} satisfies Meta<CTASection>;

export default meta;
type Story = StoryObj<CTASection>;

export const DefaultFull: Story = {
  args: {
    titleText: "Scale out with Ubuntu Server",
    variant: "default",
    layout: "100",
    blocks: [
      {
        type: "cta",
        item: {
          type: "html",
          content: "<a href='#'>Download Ubuntu Server &rsaquo;</a>",
        },
      },
    ],
  },
};

export const DefaultOffset: Story = {
  args: {
    titleText: "Scale out with Ubuntu Server",
    variant: "default",
    layout: "25/75",
    blocks: [
      {
        type: "cta",
        item: {
          type: "html",
          content:
            "For more information, <a href='#'>read the docs</a><br />or <a href='#'>contact us</a> to let our experts help you take the next step",
        },
      },
    ],
  },
};

export const BlockFull: Story = {
  args: {
    titleText: "Get Ubuntu for your organisation",
    variant: "block",
    layout: "100",
    blocks: [
      {
        type: "description",
        item: {
          content:
            "Ubuntu is used by thousands of development teams around the world because of its versatility, reliability, regularly updated kernels and security updates.",
        },
      },
      {
        type: "cta",
        item: {
          primary: {
            content_html: "Get in touch",
            attrs: { href: "#" },
          },
          secondaries: [
            {
              content_html: "Download Ubuntu Server",
              attrs: { href: "#" },
            },
          ],
          link: {
            content_html: "Learn about Ubuntu Pro &rsaquo;",
            attrs: { href: "#" },
          },
        },
      },
    ],
  },
};

export const BlockOffset: Story = {
  args: {
    titleText: "Get Ubuntu for your organisation",
    variant: "block",
    layout: "25/75",
    blocks: [
      {
        type: "description",
        item: {
          content:
            "Ubuntu is used by thousands of development teams around the world because of its versatility, reliability, regularly updated kernels and security updates.",
        },
      },
      {
        type: "cta",
        item: {
          primary: {
            content_html: "Get in touch",
            attrs: { href: "#" },
          },
          secondaries: [
            {
              content_html: "Download Ubuntu Server",
              attrs: { href: "#" },
            },
          ],
          link: {
            content_html: "Learn about Ubuntu Pro &rsaquo;",
            attrs: { href: "#" },
          },
        },
      },
    ],
  },
};
