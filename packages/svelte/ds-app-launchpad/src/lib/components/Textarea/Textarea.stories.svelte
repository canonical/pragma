<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import Textarea from "./Textarea.svelte";

	const { Story } = defineMeta({
		title: "components/Textarea",
		tags: ["autodocs"],
		component: Textarea,
		argTypes: {
			disabled: {
				control: { type: "boolean" },
				description: "Disables the textarea, preventing user interaction.",
				table: {
					type: { summary: "boolean" },
					category: "properties",
				},
			},
			placeholder: {
				control: { type: "text" },
				description: "The placeholder text for the textarea.",
				table: {
					type: { summary: "string" },
					category: "properties",
				},
			},
		},
	});
	let value = $state("");
</script>

<Story name="Default" />

<Story
	name="With bound value"
	argTypes={{ value: { table: { disable: true } } }}
>
	{#snippet template({ value: _, ...args })}
		<!--
			<script lang="ts">
				let value = $state("");
			</script>
		-->
		<Textarea {...args} bind:value />
		<span style="margin-inline-start: 0.5rem;">Current value: {value}</span>
	{/snippet}
</Story>

<Story name="Disabled" args={{ placeholder: "Disabled...", disabled: true }} />

<Story
	name="Invalid"
	args={{
		required: true,
		minlength: 50,
		value: "",
		placeholder: "Type less than 50 characters and unfocus",
	}}
/>
