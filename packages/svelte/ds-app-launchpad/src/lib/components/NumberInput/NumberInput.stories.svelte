<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { MODIFIER_FAMILIES } from "../../modifier-families";
	import NumberInput from "./NumberInput.svelte";

	const { Story } = defineMeta({
		title: "Components/NumberInput",
		tags: ["autodocs"],
		component: NumberInput,
		args: {
			placeholder: "Enter number...",
		},
	});
</script>

<script lang="ts">
	let value = $state(42);
</script>

<Story name="Default" />

<Story name="Severities">
	{#snippet template(args)}
		<div
			style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
		>
			{#each MODIFIER_FAMILIES["severity"] as severity (severity)}
				<NumberInput {...args} {severity} placeholder={severity || "default"} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Densities">
	{#snippet template(args)}
		<div
			style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
		>
			{#each ["dense", "medium"] as const as density (density)}
				<NumberInput {...args} {density} placeholder={density} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="With bound value"
	argTypes={{ value: { table: { disable: true } } }}
>
	{#snippet template({ value: _, ...args })}
		<!--
			<script lang="ts">
				let value = $state(42);
			</script>
		-->
		<NumberInput {...args} bind:value />
		<span style="margin-inline-start: 0.5rem;">Current value: {value}</span>
	{/snippet}
</Story>

<Story
	name="Invalid state"
	args={{
		required: true,
		min: 0,
		max: 10,
		placeholder: "Enter a number greater than 10 and unfocus",
		style: "width: 380px;",
	}}
/>
