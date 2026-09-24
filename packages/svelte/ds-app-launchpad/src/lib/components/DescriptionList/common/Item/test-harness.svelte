<!-- Test harness: Item inside a real DescriptionList, so the context the
     component reads is set by its actual provider instead of a module mock. -->
<script lang="ts">
  import DescriptionList from "../../DescriptionList.svelte";
  import Item from "./Item.svelte";
  import type { ItemProps } from "./types.js";

  let { item }: { item: ItemProps } = $props();
</script>

<DescriptionList>
  <Item {...item} />
</DescriptionList>
