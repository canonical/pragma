<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Spinner from "./Spinner.svelte";

  const { Story } = defineMeta({
    title: "Components/Spinner",
    component: Spinner,
    tags: ["autodocs"],
  });
</script>

<Story name="Default">
	{#snippet template(args)}
		<Spinner {...args} />
	{/snippet}
</Story>
