<!-- Ported from @canonical/react-ds-app storybook/layouts/Composed.mdx -->

<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import {
    ApplicationLayout,
    ContentLayout,
    ViewLayout,
  } from "../../lib/index.js";
  import LayoutFrame from "./LayoutFrame.svelte";
  import LayoutSlot from "./LayoutSlot.svelte";
  import MockCard from "./MockCard.svelte";

  const { Story } = defineMeta({
    title: "Layouts/Composed",
    parameters: { layout: "fullscreen" },
  });
</script>

<!-- ApplicationLayout > ViewLayout > ContentLayout, slots marked with
LayoutSlot (dashed) and example content with MockCard (solid). -->
<Story name="Default" asChild>
	<LayoutFrame blockSize="40rem">
		<ApplicationLayout>
			{#snippet navigation()}
				<LayoutSlot name="navigation" style="inline-size: 16rem" />
			{/snippet}
			<ViewLayout>
				{#snippet aside()}
					<LayoutSlot name="aside" style="inline-size: 20rem" />
				{/snippet}
				<ContentLayout>
					{#each Array.from({ length: 8 }) as _, i (i)}
						<MockCard style="min-block-size: 8rem" />
					{/each}
				</ContentLayout>
			</ViewLayout>
		</ApplicationLayout>
	</LayoutFrame>
</Story>
