<!-- Ported from @canonical/react-ds-app ViewLayout -->

<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import LayoutFrame from "../../../storybook/layouts/LayoutFrame.svelte";
  import LayoutSlot from "../../../storybook/layouts/LayoutSlot.svelte";
  import ViewLayout from "./ViewLayout.svelte";

  /**
   * ViewLayout — a single view within the application shell.
   *
   * Divides its space between the view content (default slot, `1fr`) and an
   * optional contextual aside (named slot, `min-content`), per the ontology
   * instance `apps.layout.view_layout`.
   */
  const { Story } = defineMeta({
    title: "Layouts/ViewLayout",
    component: ViewLayout,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
  });
</script>

<!-- Content (1fr) + contextual aside (min-content). -->
<Story name="Default" asChild>
	<LayoutFrame>
		<ViewLayout>
			<LayoutSlot name="default" />
			{#snippet aside()}
				<LayoutSlot name="aside" style="inline-size: 20rem" />
			{/snippet}
		</ViewLayout>
	</LayoutFrame>
</Story>

<!-- Without the aside slot, the content takes the full width. -->
<Story name="WithoutAside" asChild>
	<LayoutFrame>
		<ViewLayout>
			<LayoutSlot name="default" />
		</ViewLayout>
	</LayoutFrame>
</Story>
