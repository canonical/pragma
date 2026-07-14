<!-- Ported from @canonical/react-ds-app ApplicationLayout -->

<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import LayoutFrame from "#storybook/layouts/LayoutFrame.svelte";
  import LayoutSlot from "#storybook/layouts/LayoutSlot.svelte";
  import ApplicationLayout from "./ApplicationLayout.svelte";

  /**
   * ApplicationLayout — the application shell.
   *
   * Divides the viewport between a leading navigation rail (named slot,
   * `min-content`) and the main content area (default slot, `1fr`), per the
   * ontology instance `apps.layout.application_layout`.
   */
  const { Story } = defineMeta({
    title: "Layouts/ApplicationLayout",
    component: ApplicationLayout,
    tags: ["autodocs"],
    parameters: { layout: "fullscreen" },
  });
</script>

<!-- Navigation rail (min-content) + content area (1fr). -->
<Story name="Default" asChild>
	<LayoutFrame>
		<ApplicationLayout>
			{#snippet navigation()}
				<LayoutSlot name="navigation" style="inline-size: 16rem" />
			{/snippet}
			<LayoutSlot name="default" />
		</ApplicationLayout>
	</LayoutFrame>
</Story>

<!-- Without the navigation slot, the content takes the full width. -->
<Story name="WithoutNavigation" asChild>
	<LayoutFrame>
		<ApplicationLayout>
			<LayoutSlot name="default" />
		</ApplicationLayout>
	</LayoutFrame>
</Story>
