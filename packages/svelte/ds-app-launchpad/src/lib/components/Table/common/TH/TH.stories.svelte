<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Table } from "../../index.js";
  import TH from "./TH.svelte";

  const { Story } = defineMeta({
    title: "Components/Table/TH",
    tags: ["autodocs"],
    component: TH,
    argTypes: {
      action: { control: false },
    },
  });
</script>

<Story name="With Sort Button">
  {#snippet template({ action: _, ...args })}
    <Table>
      <thead>
        <tr>
          <Table.TH {...args}>
            Header
            {#snippet action()}
              <Table.TH.SortButton aria-label="Sort" />
            {/snippet}
          </Table.TH>
        </tr>
      </thead>
    </Table>
  {/snippet}
</Story>

<Story name="With Sort Link">
  {#snippet template({ action: _, ...args })}
    <Table>
      <thead>
        <tr>
          <Table.TH {...args}>
            Header
            {#snippet action()}
              <Table.TH.SortButton aria-label="Sort" href="?sort=asc" />
            {/snippet}
          </Table.TH>
        </tr>
      </thead>
    </Table>
  {/snippet}
</Story>
