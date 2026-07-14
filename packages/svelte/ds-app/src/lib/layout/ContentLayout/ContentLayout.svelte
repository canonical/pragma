<!-- Ported from @canonical/react-ds-app ContentLayout -->

<!--
@component
ContentLayout — the responsive content grid of a view.

Lays its children (default slot) on one of the design system's grid
presets, per the ontology instance `apps.layout.content_layout`:
fixed-responsive breakpoint columns by default, or the intrinsic
(fluid auto-fill) grid via `grid="intrinsic"`. Children are grid items;
span them via `grid-column`/`grid-row` where a card needs more room.
-->

<script lang="ts">
  import type { ContentLayoutProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds content-layout";

  let {
    class: className,
    children,
    grid = "responsive",
    ...rest
  }: ContentLayoutProps = $props();
</script>

<div class={[componentCssClassName, "grid", grid, className]} {...rest}>
	{@render children?.()}
</div>
