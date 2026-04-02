<!-- @canonical/generator-ds 0.10.0-experimental.2 -->

<script lang="ts">
  import { CloseIcon } from "@canonical/svelte-icons";
  import { Button } from "../../../../../../Button/index.js";
  import type { CloseButtonProps } from "./types.js";

  const componentCssClassName = "ds dialog-content-close-button";

  let {
    class: className,
    "aria-label": ariaLabel = "Close",
    type = "button",
    ...rest
  }: CloseButtonProps = $props();
</script>

<Button
  class={[componentCssClassName, className]}
  aria-label={ariaLabel}
  severity="base"
  {type}
  {...rest}
>
  {#snippet iconLeft()}
    <CloseIcon />
  {/snippet}
</Button>
