import { html } from "lit";
import { pageLayout } from "./pageLayout.js";

export const hyperscalePage = pageLayout(html`
        <ds-hero title="Ubuntu leads in hyperscale" layout="stacked"
            .media=${{
              src: "https://res.cloudinary.com/canonical/image/fetch/f_auto,q_auto,fl_sanitize,w_1036/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2F4679027f-hyperscale.png",
              sizes: "(min-width: 600px) 600px, 100vw",
              width: 600,
              alt: "hyperscale",
            }}
            description="Ubuntu is the hyperscale OS, natively powering scale-out workloads on a new wave of low-cost, ultra-dense hardware based on x86 and ARM processors."
        >
            <div slot="cta">
                <hr/>
                <ds-button class="constructive">Download Ubuntu Server</ds-button>
                <ds-button variant="link">Download Ubuntu for ARM›</ds-button>
            </div>
        </ds-hero>
`);
