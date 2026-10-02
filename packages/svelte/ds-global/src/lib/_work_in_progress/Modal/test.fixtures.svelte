<script lang="ts" module>
  import { Content, Footer, Header } from "./common/index.js";
  import type { ModalCloseProps } from "./types.js";

  // TODO(button): Replace the native buttons with the DS Button once available.
  const titleText = "Modal title";
  const contentText = "This is the modal content.";
  const dismissButtonText = "Close";
  const closeButtonText = "Done";
  const commandCloseButtonText = "Cancel";

  export {
    children,
    closeButtonText,
    commandCloseButtonText,
    contentText,
    dismissButtonText,
    titleText,
  };
</script>

{#snippet children(closeProps: ModalCloseProps, close: () => void)}
  <Header>{titleText}</Header>
  <Content>
    <p>{contentText}</p>
  </Content>
  <Footer>
    <button {...closeProps}>{commandCloseButtonText}</button>
    <button onclick={close}>{closeButtonText}</button>
  </Footer>
{/snippet}
