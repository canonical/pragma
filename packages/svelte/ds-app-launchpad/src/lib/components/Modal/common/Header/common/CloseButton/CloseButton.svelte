<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { getModalContext } from "@canonical/svelte-ds-global";
  import { CloseIcon } from "@canonical/svelte-icons";
  import { Button } from "../../../../../Button/index.js";
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

<Button
  class={[componentCssClassName, className]}
  aria-label={ariaLabel}
  importance="tertiary"
  {type}
  commandfor={modalContext.id}
  {command}
  {...rest}
>
  {#snippet iconLeft()}
    <CloseIcon />
  {/snippet}
</Button>

<!-- @component
`Modal.Header.CloseButton` closes its Modal through the Invoker Commands API. It is what `Modal.Header` renders by default.

## Example Usage
```svelte
<Modal.Header>
  Discard pending review?
  {#snippet closeButton()}
    <Modal.Header.CloseButton class="my-custom-class" />
  {/snippet}
</Modal.Header>
```
-->
