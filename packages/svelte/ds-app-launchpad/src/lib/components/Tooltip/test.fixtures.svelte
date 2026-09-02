<script lang="ts" module>
  import type { TooltipTriggerProps } from "./types.js";

  export { children, trigger };
</script>

{#snippet trigger(triggerProps: TooltipTriggerProps)}
  <button {...triggerProps}>Tooltip trigger</button>
{/snippet}

{#snippet children()}
  <span>Tooltip content</span>
{/snippet}
