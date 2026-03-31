import { html } from "lit";

export const serverPage = html`
    <ds-site-layout>
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
        <ds-logo-section
            title="The quick brown fox jumps over the lazy dog"
            description="The quick brown fox jumps over the lazy dog"
            description-href="#"
        >
            <img slot="logos" src="https://assets.ubuntu.com/v1/38fdfd23-Dell-logo.png" alt="Dell Technologies" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/cd5f636a-hp-logo.png" alt="Hewlett Packard" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/f90702cd-lenovo-logo.png" alt="Lenovo" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/2ef3c028-amazon-web-services-logo.png" alt="Amazon Web Services" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/cb7ef8ac-ibm-cloud-logo.png" alt="IBM Cloud" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/210f44e4-microsoft-azure-new-logo.png" alt="Microsoft Azure" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/a554a818-google-cloud-logo.png" alt="Google Cloud" loading="lazy">
            <img slot="logos" src="https://assets.ubuntu.com/v1/b3e692f4-oracle-new-logo.png" alt="Oracle" loading="lazy">

        </ds-logo-section>
    </ds-site-layout>
`;
