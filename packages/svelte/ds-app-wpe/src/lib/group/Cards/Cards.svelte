<script lang="ts">
  import type { CardsProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds cards subgrid";

  let {
    cardSpan = 1,
    class: className,
    children,
    ...rest
  }: CardsProps = $props();

  const span = $derived(Math.max(1, Math.floor(Number(cardSpan) || 1)));
</script>

<div
  class={[componentCssClassName, className]}
  style:--card-span={span}
  {...rest}
>
  {@render children?.()}
</div>

<!-- @component
The `Cards` component lays out a set of `Card`s on a shared grid so that each
card's sections (image, header, content, footer) line up across the row.

Requires a top-level `.grid` parent — `Cards` is a subgrid and inherits the
master columns. Outside a grid it degrades to a plain block.

`cardSpan` sets how many master columns each card spans (default: `1`).

`import { Cards } from "@canonical/svelte-ds-app-wpe";`

## Example Usage
```svelte
<div class="grid">
  <Cards cardSpan={2}>
    <Card>…</Card>
    <Card>…</Card>
  </Cards>
</div>
```

@implements dso:global.group.cards
-->
