<script lang="ts">
  import { Item } from "../common/index.js";
  import type { CollapsedItemsProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds collapsed-items";

  let { segments, hasCurrent }: CollapsedItemsProps = $props();

  // This only keeps track of whether the menu opened by clicking on the trigger
  // Focus and hover-triggered opening is handled 100% in CSS
  let collapseClickOpened = $state(false);
</script>

<svelte:window
  onclick={() => (collapseClickOpened = false)}
  onkeydown={(e) => {
    if (e.key === "Escape") {
      collapseClickOpened = false;
    }
  }}
/>

<!-- This doesn't need keyboard navigation, as the links inside themselves are always tab-focusable. The click handler is for sighted use of touch devices on which hover does not exist -->
<li
  role="none"
  class={componentCssClassName}
  class:open={collapseClickOpened}
  onclick={(e) => {
    if (e.target !== e.currentTarget) return;
    e.stopPropagation();
    collapseClickOpened = !collapseClickOpened;
  }}
>
  <ol role="none" data-testid="collapsed-segments">
    {#each segments as { collapsed: _, ...segment }, i (i)}
      <li role="listitem">
        <Item {...segment} current={hasCurrent && i === segments.length - 1} />
      </li>
    {/each}
  </ol>
</li>
