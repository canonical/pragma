<script lang="ts" module>
  import type { SidePanelTriggerProps } from "./types.js";

  const triggerText = "Open SidePanel";
  const contentText = "This is the side panel content.";
  const closeButtonText = "Close";

  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export { children, closeButtonText, contentText, trigger, triggerText };
</script>

{#snippet trigger(triggerProps: SidePanelTriggerProps)}
  <button {...triggerProps}>{triggerText}</button>
{/snippet}

{#snippet children(commandfor: string, close: () => void)}
  <div>
    <p>{contentText}</p>
    <button {commandfor} command="close" onclick={close}
      >{closeButtonText}</button
    >
  </div>
{/snippet}
