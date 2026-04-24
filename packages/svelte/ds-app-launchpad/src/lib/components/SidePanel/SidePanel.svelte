<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { Modal } from "../Modal/index.js";
  import type { SidePanelMethods, SidePanelProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-panel";

  let { class: className, ...rest }: SidePanelProps = $props();

  let modalMethods = $state<SidePanelMethods>();

  export const showModal: SidePanelMethods["showModal"] = () => {
    modalMethods?.showModal();
  };

  export const close: SidePanelMethods["close"] = () => {
    modalMethods?.close();
  };
</script>

<Modal
  bind:this={modalMethods}
  class={[componentCssClassName, className]}
  {...rest}
/>

<!-- @component
`SidePanel` displays a `Modal` with a side-docked layout, sliding in from the right edge of the viewport.

For API details and usage patterns, refer to `Modal`.

-->
