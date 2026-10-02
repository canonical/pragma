<script lang="ts">
  import { Modal } from "@canonical/svelte-ds-global";
  import type { ModalProps } from "./types.js";

  let { open = $bindable(), ...rest }: ModalProps = $props();
</script>

<Modal bind:open {...rest} />

<!-- @component
`Modal` displays content in a dialog overlaying the main application. For its API and usage patterns, refer to the `@canonical/svelte-ds-global` Modal.
-->
