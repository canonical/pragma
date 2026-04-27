<!-- @canonical/generator-ds 0.10.0-experimental.5 -->

<script lang="ts">
  import type { TableProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds table";

  let { class: className, children, ...rest }: TableProps = $props();
</script>

<table class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</table>

<!-- @component
`Table` is a styled table element.

## Example Usage
```svelte
<Table>
  <caption>Sample Data</caption>
  <thead>
    <tr>
      <Table.TH aria-sort="ascending" scope="col">
        Sortable Column
        {#snippet action()}
          <Table.TH.SortButton onclick={handleSortClick} aria-label="Sort descending by Sortable Column" />
        {/snippet}
      </Table.TH>
      <th scope="col">Non-Sortable Column</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
    <tr>
      <td>Data 3</td>
      <td>Data 4</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>Footer 1</td>
      <td>Footer 2</td>
    </tr>
  </tfoot>
</Table>
```
-->
