<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { Modal } from "../Modal/index.js";
  import type { SidePanelProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-panel";

  let {
    class: className,
    open = $bindable(),
    ...rest
  }: SidePanelProps = $props();
</script>

<Modal
  bind:open
  class={[componentCssClassName, className]}
  --modal-backdrop-color="transparent"
  {...rest}
/>

<!-- @component
`SidePanel` displays a `Modal` with a side-docked layout, sliding in from the right edge of the viewport.

For API details and usage patterns, refer to `Modal`.

-->
