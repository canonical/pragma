<script lang="ts">
  import { getModalContext } from "@canonical/svelte-ds-global";
  import { CloseButton } from "./common/index.js";
  import type { HeaderProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-panel-header";

  let {
    class: className,
    children,
    closeButton = true,
    ...rest
  }: HeaderProps = $props();

  const modalContext = getModalContext();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  <span class="title" id={modalContext.titleId}>
    {@render children?.()}
  </span>
  {#if closeButton === true}
    <CloseButton />
  {:else if closeButton}
    {@render closeButton()}
  {/if}
</div>

<!-- @component
`SidePanel.Header` carries the side panel title and, by default, a `SidePanel.Header.CloseButton`. The title names the side panel.

## Example Usage
```svelte
<SidePanel.Header>Packages table views</SidePanel.Header>
```
-->
