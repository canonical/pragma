<script lang="ts">
  import type { ContentProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-panel-content";

  let { class: className, children, ...rest }: ContentProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</div>

<!-- @component
`SidePanel.Content` holds the side panel's main information.

## Example Usage
```svelte
<SidePanel.Content>Main content</SidePanel.Content>
```
-->
