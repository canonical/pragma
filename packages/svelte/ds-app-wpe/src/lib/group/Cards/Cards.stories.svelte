<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Card } from "../../components/Card/index.js";
  import Component from "./Cards.svelte";

  const { Story } = defineMeta({
    title: "Groups/Cards",
    component: Component,
    tags: ["autodocs"],
    parameters: {
      grid: "responsive",
      controls: { include: ["children", "cardSpan"] },
      docs: {
        description: {
          component:
            '`Cards` lays out a set of `Card`s on a shared grid so every card\'s sections (image, header, content, footer) line up across the row.\n\nIt **requires a top-level `.grid`** because it is a subgrid — it inherits the master columns and defines the shared section rows. The `grid` story param (`"responsive"` here → fixed 4/8/12 tracks) supplies it on both the canvas and the autodocs page; switch it to `"intrinsic"` / `"none"` from the toolbar.\n\n`cardSpan` sets how many master columns each card spans. The component default is `1` (packs the most cards per row); the stories here use `2`+ for legible demos. Sample content is drawn from the Canonical / Ubuntu 26.04 LTS universe.',
        },
      },
    },
    argTypes: {
      cardSpan: { control: { type: "number", min: 1, step: 1 } },
      children: { control: { disable: true } },
    },
    args: { cardSpan: 2 },
  });

  // ── Products ──────────────────────────────────────────────────────────────

  const placeholderImageSrc =
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='800'%20height='450'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23d9d9d9'/%3E%3C/svg%3E";

  interface CardFixture {
    title: string;
    href: string;
    body: string;
    count: number;
  }

  const canonicalFixtures: CardFixture[] = [
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

  // ── MAAS machines ─────────────────────────────────────────────────────────

  type MaasStatus =
    | "Deployed"
    | "Ready"
    | "Allocated"
    | "Deploying"
    | "Commissioning"
    | "Failed";

  interface MaasFixture {
    hostname: string;
    status: MaasStatus;
    os: string;
    spec: string;
    alerts: number;
  }

  const maasFixtures: MaasFixture[] = [
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
</script>

<!-- Default: cards spanning 2 columns. Despite different copy lengths, images,
     headings and footers still line up on shared rows. -->
<Story name="Default" args={{ cardSpan: 2 }}>
  {#snippet template(args)}
    <Component {...args}>
      {#each canonicalFixtures.slice(0, 3) as f (f.title)}
        <Card>
          <Card.Image src={placeholderImageSrc} alt="" />
          <Card.Content>
            <h4><a href={f.href}>{f.title}</a></h4>
            <p class="p">{f.body}</p>
          </Card.Content>
          <Card.Footer>
            <span class="p">{f.count}</span>
          </Card.Footer>
        </Card>
      {/each}
    </Component>
  {/snippet}
</Story>

<!-- `cardSpan={2}` — medium cards, more per row than the wide layout. -->
<Story name="Span Two" args={{ cardSpan: 2 }}>
  {#snippet template(args)}
    <Component {...args}>
      {#each canonicalFixtures.slice(0, 4) as f (f.title)}
        <Card>
          <Card.Image src={placeholderImageSrc} alt="" />
          <Card.Content>
            <h4><a href={f.href}>{f.title}</a></h4>
            <p class="p">{f.body}</p>
          </Card.Content>
          <Card.Footer>
            <span class="p">{f.count}</span>
          </Card.Footer>
        </Card>
      {/each}
    </Component>
  {/snippet}
</Story>

<!-- `cardSpan={4}` — wide cards (3 per row on a 12-column grid). -->
<Story name="Span Four" args={{ cardSpan: 4 }}>
  {#snippet template(args)}
    <Component {...args}>
      {#each canonicalFixtures as f (f.title)}
        <Card>
          <Card.Image src={placeholderImageSrc} alt="" />
          <Card.Content>
            <h4><a href={f.href}>{f.title}</a></h4>
            <p class="p">{f.body}</p>
          </Card.Content>
          <Card.Footer>
            <span class="p">{f.count}</span>
          </Card.Footer>
        </Card>
      {/each}
    </Component>
  {/snippet}
</Story>

<!-- ── Scale: 3 → 15 MAAS machines (one system) ───────────────────────────── -->

<!-- Three machines — a small MAAS console view. -->
<Story name="Three Machines" args={{ cardSpan: 4 }}>
  {#snippet template(args)}
    <Component {...args}>
      {#each maasFixtures.slice(0, 3) as m (m.hostname)}
        <Card>
          <Card.Header>
            <h5>{m.hostname}</h5>
            <span class="p">{m.status}</span>
          </Card.Header>
          <Card.Content>
            <p class="p">{m.os}<br />{m.spec}</p>
          </Card.Content>
          <Card.Footer>
            <span class="p">{m.alerts}</span>
          </Card.Footer>
        </Card>
      {/each}
    </Component>
  {/snippet}
</Story>

<!-- Six machines. -->
<Story name="Six Machines" args={{ cardSpan: 4 }}>
  {#snippet template(args)}
    <Component {...args}>
      {#each maasFixtures.slice(0, 6) as m (m.hostname)}
        <Card>
          <Card.Header>
            <h5>{m.hostname}</h5>
            <span class="p">{m.status}</span>
          </Card.Header>
          <Card.Content>
            <p class="p">{m.os}<br />{m.spec}</p>
          </Card.Content>
          <Card.Footer>
            <span class="p">{m.alerts}</span>
          </Card.Footer>
        </Card>
      {/each}
    </Component>
  {/snippet}
</Story>

<!--
  Fifteen MAAS machines — a full fleet listing. `cardSpan={2}` tiles them
  densely while the shared rows keep every hostname, spec and status aligned
  across the grid.
-->
<Story name="Fifteen Machines" args={{ cardSpan: 2 }}>
  {#snippet template(args)}
    <Component {...args}>
      {#each maasFixtures as m (m.hostname)}
        <Card>
          <Card.Header>
            <h5>{m.hostname}</h5>
            <span class="p">{m.status}</span>
          </Card.Header>
          <Card.Content>
            <p class="p">{m.os}<br />{m.spec}</p>
          </Card.Content>
          <Card.Footer>
            <span class="p">{m.alerts}</span>
          </Card.Footer>
        </Card>
      {/each}
    </Component>
  {/snippet}
</Story>
