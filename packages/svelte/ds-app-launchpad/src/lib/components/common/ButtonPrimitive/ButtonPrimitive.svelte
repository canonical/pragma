<script lang="ts">
	import type {
		HTMLAnchorAttributes,
		HTMLButtonAttributes,
	} from "svelte/elements";
	import type { ButtonPrimitiveProps } from "./types";

	let {
		ref = $bindable(),
		href,
		children,
		disabled,
		...rest
	}: ButtonPrimitiveProps = $props();
</script>

{#if href}
	<!--
		Disabled anchor state implementation is inspired by: https://github.com/huntabyte/bits-ui/blob/main/packages/bits-ui/src/lib/bits/button/components/button.svelte
	-->
	<a
		bind:this={ref}
		role={disabled && href ? "link" : undefined}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		tabindex={disabled ? -1 : 0}
		{...rest as HTMLAnchorAttributes}>{@render children?.()}</a
	>
{:else}
	<button bind:this={ref} {disabled} {...rest as HTMLButtonAttributes}>
		{@render children?.()}
	</button>
{/if}
