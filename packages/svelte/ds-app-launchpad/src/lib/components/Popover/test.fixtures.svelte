<script lang="ts" module>
  import type { PopoverTriggerProps } from "./types.js";

  const triggerOpenText = "Open Popover";
  const triggerCloseText = "Close Popover";
  const childrenText = "This is content of the popover.";

  export { childrenText, triggerCloseText, triggerOpenText };
  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export { children, trigger };
</script>

{#snippet trigger(triggerProps: PopoverTriggerProps, open: boolean)}
  <button {...triggerProps}>
    {#if open}
      {triggerCloseText}
    {:else}
      {triggerOpenText}
    {/if}
  </button>
{/snippet}

{#snippet children()}
  <div>{childrenText}</div>
{/snippet}
