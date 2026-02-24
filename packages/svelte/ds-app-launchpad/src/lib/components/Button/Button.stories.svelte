<script lang="ts" module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import Button from "./Button.svelte";
	import type { ButtonProps } from "./types";
	import { fn } from "storybook/test";
	import { MODIFIER_FAMILIES } from "../../modifier-families";
	import { ArchiveIcon } from "@canonical/svelte-icons";

	const BUTTON_SEVERITIES = [
		"brand",
		"base",
		...MODIFIER_FAMILIES.severity,
	] as const satisfies readonly NonNullable<ButtonProps["severity"]>[];

	const { Story } = defineMeta({
		title: "Components/Button",
		component: Button,
		tags: ["autodocs"],
	});
</script>

<Story
	name="Default"
	args={{
		onclick: fn(),
	}}
>
	{#snippet template(args)}
		<Button {...args}>Button</Button>
	{/snippet}
</Story>

<Story name="Severities">
	{#snippet template(args)}
		{#each BUTTON_SEVERITIES as severity (severity)}
			<Button {...args} {severity} onclick={fn()}>
				{severity}
			</Button>
			&nbsp;
		{/each}
	{/snippet}
</Story>

<Story name="Densities">
	{#snippet template(args)}
		{#each MODIFIER_FAMILIES.density as density (density)}
			<Button {...args} {density} onclick={fn()}>
				{density}
			</Button>
			&nbsp;
		{/each}
	{/snippet}
</Story>

<Story name="With icons">
	{#snippet template(args)}
		<Button {...args} onclick={fn()}>
			{#snippet iconLeft()}
				<ArchiveIcon />
			{/snippet}
			With left icon
		</Button>
		&nbsp;
		<Button {...args} onclick={fn()}>
			With right icon
			{#snippet iconRight()}
				<ArchiveIcon />
			{/snippet}
		</Button>
		&nbsp;
		<Button {...args} onclick={fn()}>
			{#snippet iconLeft()}
				<ArchiveIcon />
			{/snippet}
			Both icons
			{#snippet iconRight()}
				<ArchiveIcon />
			{/snippet}
		</Button>
	{/snippet}
</Story>

<Story name="Icon only">
	{#snippet template(args)}
		<Button {...args} onclick={fn()}>
			{#snippet iconLeft()}
				<ArchiveIcon />
			{/snippet}
		</Button>
	{/snippet}
</Story>

<Story
	name="Loading"
	args={{
		loading: true,
	}}
>
	{#snippet template(args)}
		<Button {...args}>Loading button</Button>
	{/snippet}
</Story>

<Story
	name="Disabled"
	args={{
		disabled: true,
	}}
>
	{#snippet template(args)}
		<Button {...args}>Disabled button</Button>
	{/snippet}
</Story>

<Story
	name="As link"
	args={{
		href: "https://ubuntu.com",
	}}
>
	{#snippet template(args)}
		<Button {...args}>Link button</Button>
	{/snippet}
</Story>

<Story name="Brand with icon">
	{#snippet template(args)}
		<Button {...args} severity="brand" onclick={fn()}>
			{#snippet iconLeft()}
				<ArchiveIcon />
			{/snippet}
			Brand action
		</Button>
	{/snippet}
</Story>
