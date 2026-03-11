<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";
  import { setDescriptionListContext } from "../../context.js";
  import { DescriptionList } from "../../index.js";
  import Item from "./Item.svelte";

  const { Story } = defineMeta({
    title: "Components/DescriptionList/Item",
    tags: ["autodocs"],
    component: Item,
    args: {
      name: "Example term",
      children: "Example description" as unknown as Snippet,
    },
  });
</script>

<script lang="ts">
  setDescriptionListContext({
    layout: "auto",
  });
</script>

<Story name="Default">
  {#snippet template(args)}
    <DescriptionList>
      <DescriptionList.Item {...args} />
    </DescriptionList>
  {/snippet}
</Story>
