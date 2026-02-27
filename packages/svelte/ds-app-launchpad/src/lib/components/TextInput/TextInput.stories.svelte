<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { MODIFIER_FAMILIES } from "../../modifier-families";
	import TextInput from "./TextInput.svelte";

	const { Story } = defineMeta({
		title: "Components/TextInput",
		tags: ["autodocs"],
		component: TextInput,
		argTypes: {
			disabled: {
				control: { type: "boolean" },
				description: "Disables the text input, preventing user interaction.",
				table: {
					type: { summary: "boolean" },
					category: "properties",
				},
			},
			placeholder: {
				control: { type: "text" },
				description: "The placeholder text for the input.",
				table: {
					category: "properties",
				},
			},
		},
		args: {
			placeholder: "Enter text...",
		},
	});
</script>

<script lang="ts">
	let value = $state("Hello world");
</script>

<Story name="Default" />

<Story name="Types">
	{#snippet template(args)}
		<div
			style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
		>
			{#each ["text", "password", "email", "url", "tel", "search"] as const as type (type)}
				<TextInput {...args} {type} placeholder={type} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Severities">
	{#snippet template(args)}
		<div
			style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
		>
			{#each MODIFIER_FAMILIES["severity"] as severity (severity)}
				<TextInput {...args} {severity} placeholder={severity || "default"} />
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
				<TextInput {...args} {density} placeholder={density} />
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
				let value = $state("Hello world");
			</script>
		-->
		<TextInput {...args} bind:value />
		<span style="margin-inline-start: 0.5rem;">Current value: {value}</span>
	{/snippet}
</Story>

<Story
	name="Invalid state"
	args={{
		required: true,
		minlength: 8,
		value: "",
		placeholder: "Type less than 8 characters and unfocus",
		style: "width: 400px;",
	}}
/>
