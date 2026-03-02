<script lang="ts">
  import { ButtonPrimitive } from "../common/ButtonPrimitive/index.js";
  import { Spinner } from "../Spinner/index.js";
  import { Content } from "./common/Content";
  import type { ButtonProps } from "./types";
  import "./styles.css";

  const componentCssClassName = "ds button";

  let {
    class: className,
    ref = $bindable(),
    severity,
    density,
    children,
    iconLeft,
    iconRight,
    loading,
    disabled,
    ...rest
  }: ButtonProps = $props();

  const isDisabled = $derived(loading || disabled);
</script>

<ButtonPrimitive
	bind:ref
	class={[
		componentCssClassName,
		className,
		severity,
		density,
		{ loading, "explicit-disabled": disabled },
	]}
	disabled={isDisabled}
	{...rest}
>
	<Content {iconLeft} {iconRight}>
		{@render children?.()}
	</Content>
	{#if loading}
		<span class="loader">
			<Spinner />
		</span>
	{/if}
</ButtonPrimitive>

<!-- @component
`Button` is a styled button element.

## Example Usage
```svelte
<Button density="dense" severity="brand">
  {#snippet iconLeft()}
    <Check />
  {/snippet}
  Button Text
  {#snippet iconRight()}
    <ArrowRight />
  {/snippet}
</Button>
```
-->
