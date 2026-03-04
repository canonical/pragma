<script lang="ts">
  import type { ContentProps } from "./types";
  import "./styles.css";

  const componentCssClassName = "ds button-content";

  let {
    class: className,
    children,
    iconLeft,
    iconRight,
    ...rest
  }: ContentProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
	{#if iconLeft}
		<span class="icon left">
			{@render iconLeft()}
		</span>
	{/if}
	<span class="text">
		{@render children?.()}
	</span>
	{#if iconRight}
		<span class="icon right">
			{@render iconRight()}
		</span>
	{/if}
</div>
