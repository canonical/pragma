<script module lang="ts">
  import { SearchButton } from "./common/index.js";

  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export { inheritedChildren, overriddenChildren };
</script>

{#snippet inheritedChildren()}
  <SearchButton />
{/snippet}

{#snippet overriddenChildren()}
  <SearchButton aria-label="Custom search button" disabled={false} />
{/snippet}
