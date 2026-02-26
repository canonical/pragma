<script lang="ts">
  import { onMount } from "svelte";
  import { Item } from "../common/index.js";
  import type { ExpandedItemsProps } from "./types.js";
  import "./styles.css";
  import { useIsMounted } from "../../../../useIsMounted.svelte.js";

  const componentCssClassName = "ds expanded-items";

  let {
    segments,
    segmentWidths = $bindable(),
    containerWidth = $bindable(),
    canCollapseMore,
  }: ExpandedItemsProps = $props();

  const mounted = useIsMounted();

  const nowrap = $derived(
    // Prevent wrapping of the expanded segments if JavaScript is available (we have mounted) and we can still collapse more segments
    mounted.value && canCollapseMore,
  );
</script>

<li
  role="none"
  class={componentCssClassName}
  class:nowrap
  bind:clientWidth={containerWidth}
>
  <ol role="none">
    {#each segments as { collapsed, ...segment }, i (i)}
      <li
        role="listitem"
        bind:offsetWidth={segmentWidths[i]}
        class:hidden={collapsed}
        aria-hidden={collapsed}
      >
        <Item {...segment} current={i === segments.length - 1} />
      </li>
    {/each}
  </ol>
</li>
