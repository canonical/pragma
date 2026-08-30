<!-- Ported from @canonical/react-ds-app storybook/layouts/story-utils -->

<!--
@component
Story-only marker for an actual slot of a layout: a rectangle with a
dashed outline, labelled `slotName:\n{name}` at the top-left. Marks slot
regions only — content placed inside a slot is mocked with MockCard, not
with a LayoutSlot.

Layouts divide space and render nothing visible of their own; LayoutSlot
makes the division visible by filling a slot with a labelled, outlined
rectangle. Story-only — this folder is excluded from the package build.
-->

<script lang="ts">
  import type { Snippet } from "svelte";
  import LayoutPlaceholder from "./LayoutPlaceholder.svelte";

  interface Props {
    /** The slot name to display (e.g. "navigation", "default", "aside"). */
    name?: string;
    /** Inline-style overrides (e.g. a minimum size for grid cards). */
    style?: string;
    /** Optional content rendered under the label (e.g. nested layouts). */
    children?: Snippet;
  }

  let { name = "default", style, children }: Props = $props();
</script>

<LayoutPlaceholder dashed label={`slotName:\n${name}`} {style} {children} />
