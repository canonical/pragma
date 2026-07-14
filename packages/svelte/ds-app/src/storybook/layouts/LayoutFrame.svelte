<!-- Ported from @canonical/react-ds-app storybook/layouts/story-utils -->

<!--
@component
Frames a layout story: viewport height plus the base `.surface`, so the
surface channel tokens resolve and LayoutSlot's nested surfaces step down
the layers. Layouts size to their container (`block-size: 100%`), so
without a sized ancestor a fullscreen story would collapse — the Svelte
equivalent of the React package's `withLayoutFrame` decorator.
-->

<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Frame height — the viewport by default. */
    blockSize?: string;
    children?: Snippet;
  }

  let { blockSize = "100dvh", children }: Props = $props();
</script>

<div class="surface" style:block-size={blockSize}>
	{@render children?.()}
</div>
