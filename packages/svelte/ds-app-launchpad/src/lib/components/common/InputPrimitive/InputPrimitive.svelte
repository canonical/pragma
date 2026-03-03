<script lang="ts">
  import type { InputPrimitiveProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds input-primitive";

  let {
    value = $bindable(),
    ref = $bindable(),
    type = "text",
    class: className,
    ...rest
  }: InputPrimitiveProps = $props();
</script>

<input
  {type}
  bind:value
  bind:this={ref}
  class={[componentCssClassName, className]}
  {...rest}
/>
