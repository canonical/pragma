<script lang="ts">
  import { onMount } from "svelte";
  import { Item } from "../common/index.js";
  import type { ExpandedItemsProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds expanded-items";

  let {
    segments,
    segmentWidths = $bindable(),
    containerWidth = $bindable(),
    canCollapseMore,
  }: ExpandedItemsProps = $props();

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  const wrapExpanded = $derived(
    // Allow wrapping of the expanded segments if JavaScript is not available (we never mount) or we have already collapsed all there is to collapse
    !mounted || !canCollapseMore,
  );
</script>

<li
  role="none"
  class={componentCssClassName}
  style:white-space={wrapExpanded ? "normal" : "nowrap"}
  bind:clientWidth={containerWidth}
>
  <ol role="none">
    {#each segments as segment, i (i)}
      <li
        role="listitem"
        bind:offsetWidth={segmentWidths[i]}
        class:hidden={segment.hidden}
        aria-hidden={segment.hidden}
      >
        <Item {segment} current={i === segments.length - 1} />
      </li>
    {/each}
  </ol>
</li>
