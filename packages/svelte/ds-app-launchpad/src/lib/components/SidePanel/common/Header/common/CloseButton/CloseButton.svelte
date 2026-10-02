<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { getModalContext } from "@canonical/svelte-ds-global";
  import { CloseIcon } from "@canonical/svelte-icons";
  import { Button } from "../../../../../Button/index.js";
  import type { CloseButtonProps } from "./types.js";

  const componentCssClassName = "ds side-panel-header-close-button";

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
`SidePanel.Header.CloseButton` closes its SidePanel through the Invoker Commands API. It is what `SidePanel.Header` renders by default.

## Example Usage
```svelte
<SidePanel.Header>
  Packages table views
  {#snippet closeButton()}
    <SidePanel.Header.CloseButton class="my-custom-class"/>
  {/snippet}
</SidePanel.Header>
```
-->
