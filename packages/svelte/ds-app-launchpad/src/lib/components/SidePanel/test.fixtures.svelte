<script lang="ts" module>
  import type { ModalCloseProps } from "../Modal/index.js";
  import { Header } from "./common/index.js";
  import type { SidePanelTriggerProps } from "./types.js";

  const triggerText = "Open SidePanel";
  const titleText = "Side panel title";
  const contentText = "This is the side panel content.";
  const closeButtonText = "Done";

  export {
    children,
    closeButtonText,
    contentText,
    titleText,
    trigger,
    triggerText,
  };
</script>

{#snippet trigger(triggerProps: SidePanelTriggerProps)}
  <button {...triggerProps}>{triggerText}</button>
{/snippet}

{#snippet children(closeProps: ModalCloseProps, close: () => void)}
  <Header>{titleText}</Header>
  <div>
    <p>{contentText}</p>
    <button {...closeProps} onclick={close}>{closeButtonText}</button>
  </div>
{/snippet}
