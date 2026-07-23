<!-- Ported from @canonical/react-ds-app ContentLayout -->

<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import LayoutFrame from "../../../storybook/layouts/LayoutFrame.svelte";
  import MockCard from "../../../storybook/layouts/MockCard.svelte";
  import ContentLayout from "./ContentLayout.svelte";

  /**
   * ContentLayout — the responsive content grid of a view.
   *
   * Lays its children (default slot) on one of the design system's grid
   * presets, per the ontology instance `apps.layout.content_layout`:
   * fixed-responsive breakpoint columns by default, or the intrinsic
   * (fluid auto-fill) grid via `grid="intrinsic"`. Children are grid items;
   * span them via `grid-column`/`grid-row` where a card needs more room.
   */
  const { Story } = defineMeta({
    title: "Layouts/ContentLayout",
    component: ContentLayout,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
  });
</script>

<!-- Fixed-responsive grid (the default). -->
<Story name="Default" asChild>
	<LayoutFrame>
		<p>
			Fixed-responsive grid (default): breakpoint-driven columns — 4 below
			768px, 8 to 1279px, 12 from 1280px. Each card spans one column.
		</p>
		<ContentLayout>
			{#each Array.from({ length: 10 }) as _, i (i)}
				<MockCard style="min-block-size: 8rem" />
			{/each}
		</ContentLayout>
	</LayoutFrame>
</Story>

<!-- Intrinsic grid — opt in via grid="intrinsic". -->
<Story name="Intrinsic" asChild>
	<LayoutFrame>
		<p>
			Intrinsic grid: fluid auto-fill in groups of four minmax(--grid-col-min,
			1fr) columns — the column count follows the available width, not
			breakpoints. Resize the canvas to see the cards reflow.
		</p>
		<ContentLayout grid="intrinsic">
			{#each Array.from({ length: 24 }) as _, i (i)}
				<MockCard style="min-block-size: 8rem" />
			{/each}
		</ContentLayout>
	</LayoutFrame>
</Story>
