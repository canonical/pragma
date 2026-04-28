import { html } from "lit";
import { pageLayout } from "./pageLayout.js";

export const hyperscalePage = pageLayout(html`
  <ds-hero
    title="Ubuntu leads in hyperscale"
    layout="stacked"
    .media=${{
      src: "https://res.cloudinary.com/canonical/image/fetch/f_auto,q_auto,fl_sanitize,w_1036/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2F4679027f-hyperscale.png",
      sizes: "(min-width: 600px) 600px, 100vw",
      width: 600,
      alt: "hyperscale",
    }}
    description="Ubuntu is the hyperscale OS, natively powering scale-out workloads on a new wave of low-cost, ultra-dense hardware based on x86 and ARM processors."
  >
    <div slot="cta">
      <hr />
      <ds-link href="/download/server" variant="primary">Download Ubuntu Server</ds-link>
      <ds-link href="/download/arm">Download Ubuntu for ARM ›</ds-link>
    </div>
  </ds-hero>

  <!--
    TODO: No rich text content section web component exists in @canonical/lit-ds-prototype yet.
    Port the "Welcome to hyperscale, the future of the datacentre" and
    "Ubuntu Server for hyperscale" narrative sections when a prose/content component exists.
  -->

  <ds-tiered-list title="Here's why Ubuntu is the best answer to the scale-out challenge">
    <p slot="description">
      Ubuntu Server supports the scale-out compute model with tooling, platform support,
      and commercial backing designed for ultra-dense clusters.
    </p>

    <ds-tiered-list-item slot="items">
      <h3 slot="item-title">Scale-out at the core</h3>
      <div slot="item-description">
        <p>
          Ubuntu Server supports the scale-out compute model and provides tools which
          make it simple to manage the entire cluster.
        </p>
      </div>
    </ds-tiered-list-item>

    <ds-tiered-list-item slot="items">
      <h3 slot="item-title">No end-user license fee</h3>
      <div slot="item-description">
        <p>
          Ubuntu is offered free to end-users. Adding 100 more nodes should not require
          you to pay another 100 times for the OS.
        </p>
      </div>
    </ds-tiered-list-item>

    <ds-tiered-list-item slot="items">
      <h3 slot="item-title">Partners</h3>
      <div slot="item-description">
        <p>
          Canonical has a global program with SoC vendors and OEMs to ensure that
          platforms are enabled and certified to run Ubuntu.
        </p>
      </div>
    </ds-tiered-list-item>

    <ds-tiered-list-item slot="items">
      <h3 slot="item-title">Seamless platform support</h3>
      <div slot="item-description">
        <p>
          Ubuntu Server runs exactly the same on every enabled architecture, be it x86,
          ARM or PowerPC, with the same applications and tools.
        </p>
      </div>
    </ds-tiered-list-item>

    <ds-tiered-list-item slot="items">
      <h3 slot="item-title">Commercially supported</h3>
      <div slot="item-description">
        <p>
          Canonical backs its free OS commitment with Ubuntu Pro, including commercial
          support, systems management and access to top experts.
        </p>
      </div>
    </ds-tiered-list-item>
  </ds-tiered-list>

  <ds-cta-section
    title-text="Get up to 15 years of enterprise-grade security coverage"
    variant="block"
    layout="25/75"
    .blocks=${[
      {
        type: "description",
        item: {
          type: "html",
          content: `
            <p>Ubuntu Pro is Canonical's comprehensive subscription that delivers enterprise-grade security, management tooling, and extended support for developers and enterprises.</p>
            <ul>
              <li>Get timely security updates for the <a href="/esm">full open source stack.</a></li>
              <li>Access monitoring and management for your entire estate with <a href="/landscape">Landscape.</a></li>
              <li>Get hardening tools and configurations for <a href="/security/certifications">FIPS 140-3, CIS, DISA STIG, PCI-DSS, and the most stringent security standards.</a></li>
              <li>Minimize rolling reboots with <a href="/livepatch">Kernel Livepatch.</a></li>
              <li>Optional weekday or 24/7 support tiers.</li>
            </ul>
          `,
        },
      },
      {
        type: "cta",
        item: {
          primary: {
            content_html: "Get Ubuntu Pro",
            attrs: { href: "/pro" },
          },
          secondaries: [
            {
              content_html: "Start a 30-day free trial",
              attrs: { href: "/pro/free-trial" },
            },
          ],
        },
      },
    ]}
  ></ds-cta-section>
`);
