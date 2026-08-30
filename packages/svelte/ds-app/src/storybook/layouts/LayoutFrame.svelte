<!-- Ported from @canonical/react-ds-app storybook/layouts/story-utils -->

<!--
@component
Frames a layout story: viewport height plus the base `.surface`, so the
surface channel tokens resolve and LayoutSlot's nested surfaces step down
the layers. Also paints the surface's background color itself — Storybook's
docs page shell doesn't follow the system/dark theme, so an unpainted frame
would leave the layout's content sitting on the shell's own (always light)
background. Layouts size to their container (`block-size: 100%`), so
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

<div class="surface frame" style:block-size={blockSize}>
	{@render children?.()}
</div>

<style>
	.frame {
		/* .surface only defines the --surface-color-background variable; paint
		   it here so content isn't left on Storybook's shell background (which
		   doesn't follow the system/dark theme). */
		background: var(--surface-color-background);
	}
</style>
