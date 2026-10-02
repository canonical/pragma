<script lang="ts">
  import { getModalContext } from "../../../../context.js";
  import type { CloseButtonProps } from "./types.js";

  const componentCssClassName = "ds modal-header-close-button";

  let {
    class: className,
    "aria-label": ariaLabel = "Close",
    type = "button",
    command = "close",
    ...rest
  }: CloseButtonProps = $props();

  const modalContext = getModalContext();
</script>

<!-- TODO(button): Replace with the DS Button once available. -->
<button
  class={[componentCssClassName, className]}
  aria-label={ariaLabel}
  {type}
  commandfor={modalContext.id}
  {command}
  {...rest}
>
  ×
</button>

<!-- @component
`Modal.Header.CloseButton` closes its Modal through the Invoker Commands API. It is what `Modal.Header` renders by default.

## Example Usage
```svelte
<Modal.Header>
  Discard pending review?
  {#snippet closeButton()}
    <Modal.Header.CloseButton aria-label="Dismiss" />
  {/snippet}
</Modal.Header>
```
-->
