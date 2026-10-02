<script lang="ts">
  import { Modal } from "@canonical/svelte-ds-global";
  import { CloseButton } from "./common/index.js";
  import type { HeaderProps } from "./types.js";

  let { closeButton = true, ...rest }: HeaderProps = $props();
</script>

{#snippet defaultCloseButton()}
  <CloseButton />
{/snippet}

<Modal.Header
  closeButton={closeButton === true ? defaultCloseButton : closeButton}
  {...rest}
/>

<!-- @component
`Modal.Header` carries the modal title and, by default, a `Modal.Header.CloseButton`. For its API and usage patterns, refer to `Modal.Header` in `@canonical/svelte-ds-global`.
-->
