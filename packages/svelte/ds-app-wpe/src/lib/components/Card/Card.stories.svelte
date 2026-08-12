<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Card } from "./index.js";

  const { Story } = defineMeta({
    title: "Components/Card",
    component: Card,
    tags: ["autodocs"],
    parameters: {
      grid: "showcase",
      controls: { exclude: /.*/ },
      docs: {
        description: {
          component:
            "A Card is a subgrid, so it needs a grid parent. That parent is supplied by the addon's `grid` story param — the single grid mechanism — NOT a local grid decorator, which would nest a second grid inside the addon's and crush the card into one column. `\"showcase\"` frames a lone card the way it should read: a single ~22rem column, centred in a tall canvas, at its intrinsic height. It works identically on the story canvas and the autodocs page (switch it from the toolbar). Stories that want a different layout (surfaces) override per-story.",
        },
      },
    },
  });
</script>

<!--
  The base card: a single padded content block. `Card.Content` is the core
  API — the header, image, and footer shown in other stories are optional
  extras, not part of the base card.
-->
<Story name="Default" asChild>
  <Card>
    <Card.Content>
      <h4>Build a bare-metal cloud on a Raspberry Pi cluster with MAAS</h4>
      <p class="p">
        The Raspberry Pi 4, with its fast CPU cores, up to 8 GB of RAM and tiny
        footprint, is a great option to run a cluster on. Provisioning is easy
        with <a href="https://maas.io">MAAS</a>.
      </p>
    </Card.Content>
  </Card>
</Story>

<!--
  A full-bleed image above the content block.

  `Card.Image` is not part of the core API.
-->
<Story name="With Image" asChild>
  <Card>
    <Card.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" alt="" />
    <Card.Content>
      <h4>Build a bare-metal cloud on a Raspberry Pi cluster with MAAS</h4>
      <p class="p">
        The Raspberry Pi 4 is a great option to run a cluster on, and
        provisioning is easy with <a href="https://maas.io">MAAS</a>.
      </p>
    </Card.Content>
  </Card>
</Story>

<!--
  A card with a header, content and footer. Only the content-bearing sections
  pad themselves; the card frame applies no general padding and the image
  bleeds edge to edge. The header is not a separate visual section: no divider
  is drawn under it and it merges with the content below, so title and body
  read as one region. The footer holds tags and labels, not actions — CTAs
  belong in `Card.Content`.

  `Card.Header`, `Card.Image` and `Card.Footer` are **not core API** — the base
  card is just `Card.Content`; these are optional sections layered on top.
-->
<Story name="Header Content Footer" asChild>
  <Card>
    <Card.Image src="https://assets.ubuntu.com/v1/5ce214a4-rpi.png" alt="" />
    <Card.Header>
      <h4>Ubuntu 24.04 LTS</h4>
      <span class="p">Noble Numbat</span>
    </Card.Header>
    <Card.Content>
      <p class="p">
        The latest long-term support release, with ten years of security
        maintenance and a refreshed toolchain for developers and operators.
        <a href="https://ubuntu.com/download">Download</a> or read the
        <a href="https://ubuntu.com/blog">release notes</a>.
      </p>
    </Card.Content>
    <Card.Footer>
      <span class="p">LTS</span>
      <span class="p">Desktop</span>
      <span class="p">Server</span>
    </Card.Footer>
  </Card>
</Story>

<!--
  The Card is not a surface: it sets no background of its own, so on each
  surface it takes the *same* background as its container and reads as flush —
  delimited only by its border and radius. Placed on three different surface
  levels, the card blends with each rather than stepping to the next layer.
-->
<Story name="On Surfaces" parameters={{ grid: "responsive" }} asChild>
  <div style="min-height: 100vh; overflow: auto; grid-column: 1 / -1">
    <div
      class="surface"
      style="background: var(--surface-color-background, var(--color-background)); display: flex; flex-direction: column; align-items: stretch;"
    >
      <div class="subgrid" style="padding: 5rem">
        <Card>
          <Card.Content>
            <h4>On surface level 1</h4>
            <p class="p">The card takes the same background as the surface it sits on.</p>
          </Card.Content>
        </Card>
      </div>
      <div
        class="surface"
        style="background: var(--surface-color-background, var(--color-background)); display: flex; flex-direction: column; align-items: stretch;"
      >
        <div class="subgrid" style="padding: 5rem">
          <Card>
            <Card.Content>
              <h4>On surface level 2</h4>
              <p class="p">The card takes the same background as the surface it sits on.</p>
            </Card.Content>
          </Card>
        </div>
        <div
          class="surface"
          style="background: var(--surface-color-background, var(--color-background)); display: flex; flex-direction: column; align-items: stretch;"
        >
          <div class="subgrid" style="padding: 5rem">
            <Card>
              <Card.Content>
                <h4>On surface level 3</h4>
                <p class="p">The card takes the same background as the surface it sits on.</p>
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
</Story>
