<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";
  import { Chip } from "../Chip/index.js";
  import { DateTime } from "../DateTime/index.js";
  import { Link } from "../Link/index.js";
  import { DescriptionList } from "./index.js";

  const { Story } = defineMeta({
    title: "Components/DescriptionList",
    tags: ["autodocs"],
    component: DescriptionList,
  });
</script>

{#snippet template(args: ComponentProps<typeof DescriptionList>)}
  <DescriptionList {...args}>
    <DescriptionList.Item name="ID">134</DescriptionList.Item>
    <DescriptionList.Item name="Requested by">Jane Doe</DescriptionList.Item>
    <DescriptionList.Item name="Created">
      <DateTime date="2023-10-01T12:00:00Z" />
    </DescriptionList.Item>
    <DescriptionList.Item name="A very long term name to test layout behavior">
      This is a description for a term with a very long name to see how the
      layout handles it.
    </DescriptionList.Item>
    <DescriptionList.Item name="Status">
      <Chip value="Active" readonly severity="positive" />
    </DescriptionList.Item>
    <DescriptionList.Item name="Artifact">
      <Link href="#">View Artifact</Link>
    </DescriptionList.Item>
  </DescriptionList>
{/snippet}

<Story name="Default" {template} />

<Story name="With grid layout" args={{ layout: "grid" }} {template} />

<Story name="With list layout" args={{ layout: "list" }} {template} />
