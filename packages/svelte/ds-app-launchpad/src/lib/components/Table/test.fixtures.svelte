<script lang="ts" module>
  import type { HTMLThAttributes } from "svelte/elements";
  import { TH } from "./common/index.js";

  let sortDirection = $state<HTMLThAttributes["aria-sort"]>();
  const setSortDirection = (direction: HTMLThAttributes["aria-sort"]) => {
    sortDirection = direction;
  };

  const caption = "Table Caption";
  const thText = "Sortable Header Cell";
  const tdText = "Cell 1";
  const sortButtonText = `Sort by ${thText}`;

  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export {
    caption,
    children,
    setSortDirection,
    sortButtonText,
    tdText,
    thText,
  };
</script>

{#snippet children()}
  <caption>{caption}</caption>
  <thead>
    <tr>
      <TH aria-sort={sortDirection} scope="col">
        {thText}
        {#snippet action()}
          <TH.SortButton aria-label={sortButtonText} />
        {/snippet}
      </TH>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{tdText}</td>
    </tr>
  </tbody>
{/snippet}
