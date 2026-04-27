<script lang="ts" module>
  import { Link } from "./common/index.js";

  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export { multipleLinks, oneLink };
</script>

{#snippet oneLink()}
  <Link href="/show-more">Show more</Link>
{/snippet}

{#snippet multipleLinks()}
  <Link href="/show-more">Show more</Link>
  <Link href="/show-all">Show all</Link>
{/snippet}
