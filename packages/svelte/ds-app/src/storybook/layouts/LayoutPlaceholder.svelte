<!-- Ported from @canonical/react-ds-app storybook/layouts/story-utils -->

<!--
@component
Shared base for the layout story placeholder rectangles (LayoutSlot,
MockCard): own `.surface` (consuming the surface background channel from
@canonical/styles, so nesting steps down the layers), an outline, no
padding. Story-only — this folder is excluded from the package build.
-->

<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    /** Outline style — dashed for a slot marker, solid for mock content. */
    dashed?: boolean;
    /** Label rendered at the top-left (e.g. a slot name). Omit for none. */
    label?: string;
    /** Inline-style overrides (e.g. a minimum size for grid cards). */
    style?: string;
    /** Optional content rendered under the label (e.g. nested layouts). */
    children?: Snippet;
  }

  let { dashed = false, label, style, children }: Props = $props();
</script>

<div class="surface placeholder" class:dashed {style}>
	{#if label}
		<span class="label">{label}</span>
	{/if}
	{@render children?.()}
</div>

<style>
	.placeholder {
		background: var(--surface-color-background);
		outline: 1px solid currentcolor;
		outline-offset: -1px;
		min-block-size: var(--dimension-600, 3rem);
		block-size: 100%;
		box-sizing: border-box;
	}

	.placeholder.dashed {
		outline-style: dashed;
	}

	.label {
		white-space: pre;
	}
</style>
