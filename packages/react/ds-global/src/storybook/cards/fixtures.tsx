import type { ReactElement } from "react";
import { Badge } from "../../lib/component/Badge/index.js";
import { Card } from "../../lib/component/Card/index.js";

/**
 * Sample card content for the `Cards` stories, drawn from the Canonical /
 * Ubuntu universe around the Ubuntu 26.04 LTS cycle. Two flavours:
 *
 *  - `canonicalFixtures` — a handful of Canonical PRODUCTS (heading, body, and a
 *    count Badge, e.g. number of related integrations).
 *  - `maasFixtures` — a fleet of MAAS machines (a single system — we don't mix
 *    MAAS / LXD / Landscape in one grid): hostname, lifecycle status, OS/spec and
 *    a criticality-coloured Badge for open alerts. Useful for the larger (up to
 *    15) card grids.
 *
 * Footers use `Badge` (a numeric, criticality-aware count) as-is, with no label.
 * All copy is illustrative. A neutral 16:9 grey placeholder stands in for card
 * media (no external asset fetches).
 */
const placeholderImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='450'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23d9d9d9'/%3E%3C/svg%3E";

// ── Products ────────────────────────────────────────────────────────────────

interface CardFixture {
  title: string;
  href: string;
  /** Body copy — deliberately VARYING in length to exercise section alignment. */
  body: string;
  /** A count shown as a Badge in the footer (e.g. related integrations). */
  count: number;
}

/** Canonical products & the Ubuntu 26.04 LTS universe (varying copy lengths). */
export const canonicalFixtures: CardFixture[] = [
  {
    title: "Ubuntu 26.04 LTS",
    href: "https://ubuntu.com/download",
    body: "The next long-term support release, with ten years of security maintenance, a refreshed toolchain and the latest GNOME for desktop and server alike.",
    count: 12,
  },
  {
    title: "MAAS",
    href: "https://maas.io",
    body: "Self-service, remote installation of bare-metal servers — turn your data centre into a cloud.",
    count: 3,
  },
  {
    title: "Juju",
    href: "https://juju.is",
    body: "An open-source orchestration engine for software operators: deploy, configure, integrate and scale applications across any cloud or on-prem estate.",
    count: 8,
  },
  {
    title: "Landscape",
    href: "https://ubuntu.com/landscape",
    body: "Systems management for Ubuntu estates — patching, compliance and monitoring across physical, virtual and cloud instances at scale.",
    count: 5,
  },
  {
    title: "Ubuntu Core",
    href: "https://ubuntu.com/core",
    body: "A minimal, containerised Ubuntu for IoT and edge devices, with transactional over-the-air updates and secure boot.",
    count: 2,
  },
  {
    title: "Charmed Kubernetes",
    href: "https://ubuntu.com/kubernetes",
    body: "Conformant, multi-cloud Kubernetes with Canonical support and automated operations.",
    count: 6,
  },
];

export const productCard = (
  { title, href, body, count }: CardFixture,
  { withImage = true }: { withImage?: boolean } = {},
): ReactElement => (
  <Card key={title}>
    {withImage && <Card.Image src={placeholderImageSrc} alt="" />}
    <Card.Content>
      <h4>
        <a href={href}>{title}</a>
      </h4>
      <p className="p">{body}</p>
    </Card.Content>
    <Card.Footer>
      <Badge value={count} />
    </Card.Footer>
  </Card>
);

/** Render the first `count` product fixtures (default: all). */
export const fixtureCards = (
  count = canonicalFixtures.length,
  options?: { withImage?: boolean },
): ReactElement[] =>
  canonicalFixtures.slice(0, count).map((f) => productCard(f, options));

// ── MAAS machines (one system — no mixing) ──────────────────────────────────

/** MAAS machine life-cycle states. */
type MaasStatus =
  | "Deployed"
  | "Ready"
  | "Allocated"
  | "Deploying"
  | "Commissioning"
  | "Failed";

/** Map a MAAS status to a Badge criticality colour. */
const statusCriticality: Record<
  MaasStatus,
  "success" | "information" | "warning" | "error" | undefined
> = {
  Deployed: "success",
  Ready: "information",
  Allocated: "information",
  Deploying: "warning",
  Commissioning: "warning",
  Failed: "error",
};

interface MaasFixture {
  hostname: string;
  status: MaasStatus;
  os: string;
  /** Cores / RAM summary. */
  spec: string;
  /** Open alerts — shown as a criticality-coloured Badge. */
  alerts: number;
}

/**
 * Fifteen MAAS machines as they'd appear in the MAAS console — realistic
 * hostnames, lifecycle statuses and Ubuntu 26.04 LTS images. All one system.
 * Kept in DOM order so a truncated slice (3, 6, 9…) is still coherent.
 */
export const maasFixtures: MaasFixture[] = [
  {
    hostname: "able-mackerel",
    status: "Deployed",
    os: "Ubuntu 26.04 LTS",
    spec: "32 cores · 128 GB",
    alerts: 0,
  },
  {
    hostname: "brave-gecko",
    status: "Ready",
    os: "—",
    spec: "16 cores · 64 GB",
    alerts: 0,
  },
  {
    hostname: "calm-otter",
    status: "Commissioning",
    os: "ephemeral",
    spec: "8 cores · 32 GB",
    alerts: 1,
  },
  {
    hostname: "deft-heron",
    status: "Deployed",
    os: "Ubuntu 26.04 LTS",
    spec: "24 cores · 96 GB",
    alerts: 0,
  },
  {
    hostname: "eager-lynx",
    status: "Allocated",
    os: "—",
    spec: "12 cores · 48 GB",
    alerts: 0,
  },
  {
    hostname: "fair-marmot",
    status: "Deploying",
    os: "Ubuntu 26.04 LTS",
    spec: "48 cores · 256 GB",
    alerts: 2,
  },
  {
    hostname: "glad-puffin",
    status: "Deployed",
    os: "Ubuntu 26.04 LTS",
    spec: "64 cores · 512 GB",
    alerts: 0,
  },
  {
    hostname: "hardy-ibex",
    status: "Failed",
    os: "—",
    spec: "commissioning error",
    alerts: 5,
  },
  {
    hostname: "ideal-quokka",
    status: "Ready",
    os: "—",
    spec: "20 cores · 80 GB",
    alerts: 0,
  },
  {
    hostname: "jolly-numbat",
    status: "Deployed",
    os: "Ubuntu 26.04 LTS",
    spec: "16 cores · 64 GB",
    alerts: 1,
  },
  {
    hostname: "keen-raven",
    status: "Commissioning",
    os: "ephemeral",
    spec: "8 cores · 32 GB",
    alerts: 0,
  },
  {
    hostname: "lively-shrew",
    status: "Allocated",
    os: "—",
    spec: "36 cores · 144 GB",
    alerts: 0,
  },
  {
    hostname: "merry-teal",
    status: "Deployed",
    os: "Ubuntu 26.04 LTS",
    spec: "40 cores · 192 GB",
    alerts: 0,
  },
  {
    hostname: "noble-vole",
    status: "Deploying",
    os: "Ubuntu 26.04 LTS",
    spec: "28 cores · 112 GB",
    alerts: 3,
  },
  {
    hostname: "olive-wren",
    status: "Deployed",
    os: "Ubuntu 26.04 LTS",
    spec: "32 cores · 128 GB",
    alerts: 0,
  },
];

export const maasCard = ({
  hostname,
  status,
  os,
  spec,
  alerts,
}: MaasFixture): ReactElement => (
  <Card key={hostname}>
    <Card.Header>
      <h5>{hostname}</h5>
      <span className="p">{status}</span>
    </Card.Header>
    <Card.Content>
      <p className="p">
        {os}
        <br />
        {spec}
      </p>
    </Card.Content>
    <Card.Footer>
      <Badge value={alerts} criticality={statusCriticality[status]} />
    </Card.Footer>
  </Card>
);

/**
 * Render `count` MAAS machine cards (3–15). Clamped to the fixture set; DOM order
 * preserved so a smaller count is a coherent prefix.
 */
export const maasCards = (count: number): ReactElement[] =>
  maasFixtures
    .slice(0, Math.max(0, Math.min(count, maasFixtures.length)))
    .map(maasCard);
