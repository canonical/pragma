<script lang="ts">
  import { Link } from "../../../../Link/index.js";
  import type { ItemProps } from "./types.js";

  const componentCssClassName = "ds item";

  let { current = false, ...segment }: ItemProps = $props();
</script>

{#if segment.href !== undefined}
  <Link
    aria-current={current ? "page" : undefined}
    {...segment}
    class={[componentCssClassName, segment.class]}
  >
    {segment.label}
  </Link>
{:else}
  <span
    aria-current={current ? "page" : undefined}
    {...segment}
    class={[componentCssClassName, segment.class]}
  >
    {segment.label}
  </span>
{/if}
