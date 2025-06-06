<script lang="ts">
  import type { AwesomeButtonProps } from "./types.js";
  import clsx from "clsx";
  import "./styles.css";

  const componentCssClassName = "ds awesome-button";

  let { id, class: className, style, children }: AwesomeButtonProps = $props();
</script>

<button class={clsx(componentCssClassName, className)} {id} {style}>
  {@render children?.()}
</button>

<!-- @component
`AwesomeButton` [FIXME] (placeholder) A reusable UI component that renders content in a div container.

## Example Usage
```svelte
<AwesomeButton class="custom-class" id="unique-id">
  <p>Content goes here</p>
</AwesomeButton>
```
-->
