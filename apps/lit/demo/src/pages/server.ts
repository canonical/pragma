import { html } from "lit";
import { pageLayout } from "./pageLayout.js";

export const serverPage = pageLayout(html`
        <ds-hero title="Scale out with Ubuntu Server"
            description="Ubuntu Server brings economic and technical scalability to your enterprise data center, public or private cloud. Whether you want to deploy an OpenStack cloud, a Kubernetes cluster, or a 50,000-node render farm, Ubuntu Server delivers the best value scale-out performance available."
        >
            <div slot="cta">
                <hr/>
                <ds-button class="constructive">Download Ubuntu Server</ds-button>
                <a href="/server/hyperscale">See all features</a>
            </div>
            <img slot="media" src="https://assets.ubuntu.com/v1/a1dd867d-hero.jpg" alt="Canonical data centre" loading="lazy">
        </ds-hero>

        <ds-tiered-list title="Why choose Ubuntu Server?">
            <p slot="description">
                Scale effortlessly with the enterprise Linux server built for growth. When demand spikes, Ubuntu Server stays lean and responsive, ensuring your workloads remain performant and cost-effective, no matter how large your cluster grows.
            </p>

            <ds-tiered-list-item slot="items">
                <h3 slot="item-title">Performance and versatility</h3>
                <div slot="item-description">
                <p>
                    Ubuntu Server is certified by leading hardware OEMs, carries a lean initial deployment, and includes integrated deployment and application modeling tools, so you can get the most from your infrastructure – whether you’re deploying NoSQL databases, web farms, or the cloud.
                </p>
                </div>
            </ds-tiered-list-item>

            <ds-tiered-list-item slot="items">
                <h3 slot="item-title">A release schedule you can rely on</h3>
                <div slot="item-description">
                <p>
                    Long term support (LTS) releases of Ubuntu Server receive standard security updates for thousands of open source packages in the Ubuntu Main repository for five years by default. Interim releases every six months bring new features, while hardware enablement updates add support for the latest machines to all supported LTS releases.
                </p>
                </div>
            </ds-tiered-list-item>

            <ds-tiered-list-item slot="items">
                <h3 slot="item-title">Most widely used enterprise Linux server</h3>
                <div slot="item-description">
                <p>
                    Ubuntu is the foundation for private cloud implementation and the most-used Linux distribution in the world (for the third year in a row) according to the <a href="https://www.openlogic.com/system/files/2025-05/report-openlogic-2025-state-of-open-source-support.pdf">OpenLogic 2025 State of Open Source report</a>.
                </p>
                </div>
            </ds-tiered-list-item>

            <ds-tiered-list-item slot="items">
                <h3 slot="item-title">Enterprise-grade server support</h3>
                <div slot="item-description">
                <p>
                    Streamline server operations with <a href="https://ubuntu.com/pro">Ubuntu Pro</a> for a unified maintenance path for server fleets. It includes tools for hardening, compliance, kernel live patching, and security updates that all modern clouds or data centers need.
                </p>
                </div>
            </ds-tiered-list-item>
        </ds-tiered-list>

        <ds-logo-section
            title="Works with all your hardware"
            description="Explore all certified hardware partners ›"
            description-href="https://ubuntu.com/certified"
        >
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_96/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2F31a3d361-lenovo_logo.svg"
                alt="Lenovo"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_184/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fc21e1b85-dell_logo.svg"
                alt="Dell"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_50/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2F17f8776b-ibm_logo.svg"
                alt="IBM"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_44/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Ff953c43c-hp_logo.svg"
                alt="Hewlett Packard Enterprise"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_53/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Ff591dcf2-intel_new_logo.svg"
                alt="Intel"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_77/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Ff9551a38-cisco_logo.svg"
                alt="Cisco"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_75/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fab65b397-amd_logo.svg"
                alt="AMD"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_51/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fadd5e59c-arm_logo.svg"
                alt="ARM"
                loading="lazy">

        </ds-logo-section>
        <ds-logo-section
            title="Works with all your software"
            description="Explore all certified software partners ›"
            description-href="https://partners.ubuntu.com/programmes/software?_ga=2.95723230.315987579.1706516745-1396260062.1706111894&_gl=1*1dcinxp*_gcl_au*MTM2MjM3NzY3My4xNzcwMDI4NDE1"
        >
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_104/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fb0f72969-centrify_logo.svg"
                alt="Centrify"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_128/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2F98eccc44-openstack_logo.svg"
                alt="OpenStack"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_62/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2F5db71b68-likewise_logo.svg"
                alt="Likewise"
                loading="lazy">
            <img
                slot="logos"
                src="https://res.cloudinary.com/canonical/image/fetch/f_svg,q_auto,fl_sanitize,w_104/https%3A%2F%2Fassets.ubuntu.com%2Fv1%2Fcb0c8c5e-openbravo_logo.svg"
                alt="Openbravo"
                loading="lazy">
        </ds-logo-section>
`);
