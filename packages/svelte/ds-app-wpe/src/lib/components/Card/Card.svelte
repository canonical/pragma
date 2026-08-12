<script lang="ts">
  import type { CardProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds card";

  let { children, class: className, ...rest }: CardProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</div>

<!-- @component
The `Card` component is a container designed to represent data objects that share
the same structure. Unlike the more flexible Tile, a card is designed to have
multiple units displayed beside one another, with a predictable structure that
allows the user to compare attributes across data objects.

A Card is always a grid participant: it is a ROW SUBGRID spanning four fixed
section tracks (image / header / content / footer), inheriting them from its
parent grid. Use inside a `Cards` group to align sections across a row.

`import { Card } from "@canonical/svelte-ds-app-wpe";`

## Example Usage
```svelte
<Card>
  <Card.Content>
    <h4>Card title</h4>
    <p>Card body text.</p>
  </Card.Content>
</Card>
```

@implements ds:global.component.card
-->
