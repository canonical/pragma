<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { setDescriptionListContext } from "../../context.js";
  import { DescriptionList } from "../../index.js";
  import Item from "./Item.svelte";

  const { Story } = defineMeta({
    title: "Components/DescriptionList/Item",
    tags: ["autodocs"],
    component: Item,
    args: {
      name: "Example term",
    },
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<script lang="ts">
  setDescriptionListContext({
    layout: "auto",
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <DescriptionList>
      <DescriptionList.Item {...args}>Example description</DescriptionList.Item>
    </DescriptionList>
  {/snippet}
</Story>
