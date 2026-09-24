<!-- Test harness: SortButton inside a real TH, so the context the component
     reads is set by its actual provider instead of a module mock. -->
<script lang="ts">
  import TH from "../../TH.svelte";
  import SortButton from "./SortButton.svelte";
  import type { SortButtonProps } from "./types.js";

  let { sortButton }: { sortButton: SortButtonProps } = $props();
</script>

<TH>
  <SortButton {...sortButton} />
</TH>
