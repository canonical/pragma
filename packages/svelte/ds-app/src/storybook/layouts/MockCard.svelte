<!-- Ported from @canonical/react-ds-app storybook/layouts/story-utils -->

<!--
@component
Story-only example content (solid outline, unlabelled) — what a real
application would place IN a slot, e.g. a card on the ContentLayout grid.
-->

<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Inline-style overrides (e.g. a minimum size for grid cards). */
    style?: string;
    /** Optional card content. */
    children?: Snippet;
  }

  let { style, children }: Props = $props();
</script>

<div class="surface placeholder" {style}>
	{@render children?.()}
</div>

<style>
	/* Shared base for the placeholder rectangles: own `.surface` (consuming
	   the surface background channel from @canonical/styles, so nesting steps
	   down the layers), an outline, no padding. */
	.placeholder {
		background: var(--surface-color-background);
		outline: 1px solid currentcolor;
		outline-offset: -1px;
		min-block-size: var(--dimension-600, 3rem);
		block-size: 100%;
		box-sizing: border-box;
	}
</style>
