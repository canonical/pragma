<script module lang="ts">
  import { SearchButton } from "./common/index.js";

  export { inheritedChildren, overriddenChildren };
</script>

{#snippet inheritedChildren()}
  <SearchButton />
{/snippet}

{#snippet overriddenChildren()}
  <SearchButton aria-label="Custom search button" disabled={false} />
{/snippet}
