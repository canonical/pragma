<script lang="ts">
  import { getModalContext } from "../../context.js";
  import { CloseButton } from "./common/index.js";
  import type { HeaderProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds modal-header";

  let {
    class: className,
    children,
    closeButton = true,
    ...rest
  }: HeaderProps = $props();

  const modalContext = getModalContext();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  <div class="title" id={modalContext.titleId}>
    {@render children?.()}
  </div>
  {#if closeButton === true}
    <CloseButton />
  {:else if closeButton}
    {@render closeButton()}
  {/if}
</div>

<!-- @component
`Modal.Header` carries the modal title and a close button. The title names the dialog through `aria-labelledby`.

By default the close button is a `Modal.Header.CloseButton`, already wired to close the Modal. Set `closeButton` to `false` to drop it, or to a snippet to render your own.

## Example Usage
```svelte
<Modal.Header>Discard pending review?</Modal.Header>
```

@implements ds:global.subcomponent.modal-header
-->
