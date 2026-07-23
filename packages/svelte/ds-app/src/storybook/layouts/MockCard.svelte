<!-- Ported from @canonical/react-ds-app storybook/layouts/story-utils -->

<!--
@component
Story-only example content (solid outline, unlabelled) — what a real
application would place IN a slot, e.g. a card on the ContentLayout grid.
-->

<script lang="ts">
  import type { Snippet } from "svelte";
  import LayoutPlaceholder from "./LayoutPlaceholder.svelte";

  interface Props {
    /** Inline-style overrides (e.g. a minimum size for grid cards). */
    style?: string;
    /** Optional card content. */
    children?: Snippet;
  }

  let { style, children }: Props = $props();
</script>

<LayoutPlaceholder {style} {children} />
