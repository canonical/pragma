import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import "./CtaSection.js";
import "../CtaBlock/CtaBlock.js";
import "../ButtonLink/ButtonLink.js";
import "../SiteLayout/SiteLayout.js";
import type CtaSection from "./CtaSection.js";

const meta = {
  title: "Web Components/CtaSection",
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
} satisfies Meta<CtaSection>;

export default meta;
type Story = StoryObj<CtaSection>;

export const DefaultFull: Story = {
  render: () => html`
    <ds-cta-section title-text="Scale out with Ubuntu Server" variant="default" layout="100">
      <a slot="cta" href="#">Download Ubuntu Server &rsaquo;</a>
    </ds-cta-section>
  `,
};

export const DefaultOffset: Story = {
  render: () => html`
    <ds-cta-section title-text="Scale out with Ubuntu Server" variant="default" layout="25-75">
      <a slot="cta" href="#">Download Ubuntu Server &rsaquo;</a>
    </ds-cta-section>
  `,
};

export const BlockFull: Story = {
  render: () => html`
    <ds-cta-section title-text="Get Ubuntu for your organisation" variant="block" layout="100">
      <p slot="description">
        Ubuntu is used by thousands of development teams around the world because
        of its versatility, reliability, regularly updated kernels and security updates.
      </p>
      <ds-cta-block slot="cta">
        <ds-button-link slot="primary" variant="primary" href="#">Get in touch</ds-button-link>
        <ds-button-link slot="secondary" variant="secondary" href="#">Download Ubuntu Server</ds-button-link>
        <ds-button-link slot="link" href="#">Learn about Ubuntu Pro &rsaquo;</ds-button-link>
      </ds-cta-block>
    </ds-cta-section>
  `,
};

export const BlockOffset: Story = {
  render: () => html`
    <ds-cta-section title-text="Get Ubuntu for your organisation" variant="block" layout="25-75">
      <p slot="description">
        Ubuntu is used by thousands of development teams around the world because
        of its versatility, reliability, regularly updated kernels and security updates.
      </p>
      <ds-cta-block slot="cta">
        <ds-button-link slot="primary" variant="primary" href="#">Get in touch</ds-button-link>
        <ds-button-link slot="secondary" variant="secondary" href="#">Download Ubuntu Server</ds-button-link>
        <ds-button-link slot="link" href="#">Learn about Ubuntu Pro &rsaquo;</ds-button-link>
      </ds-cta-block>
    </ds-cta-section>
  `,
};
