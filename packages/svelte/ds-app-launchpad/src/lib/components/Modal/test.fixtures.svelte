<script lang="ts" module>
  import type { ModalTriggerProps } from "./types.js";

  const triggerText = "Open Modal";
  const contentText = "This is the modal content.";
  const closeButtonText = "Close";

  // biome-ignore lint/style/useExportType: False positive, presumably due to "cross-language" export
  export { children, closeButtonText, contentText, trigger, triggerText };
</script>

{#snippet trigger(triggerProps: ModalTriggerProps)}
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
