<script lang="ts">
  import { ButtonPrimitive } from "../common/ButtonPrimitive/index.js";
  import { Spinner } from "../Spinner/index.js";
  import { Content } from "./common/Content/index.js";
  import type { ButtonProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds button";

  let {
    class: className,
    ref = $bindable(),
    importance = "secondary",
    anticipation,
    emphasis,
    criticality,
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
    importance,
    anticipation,
    emphasis,
    criticality,
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
<Button density="dense" importance="primary" emphasis="branded">
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
