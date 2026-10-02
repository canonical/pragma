<script lang="ts">
  import type { FooterProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds side-panel-footer";

  let { class: className, children, ...rest }: FooterProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</div>

<!-- @component
`SidePanel.Footer` holds the side panel's actions.

## Example Usage
```svelte
<SidePanel.Footer>
  <Button {...closeProps}>Cancel</Button>
  <Button onclick={apply}>Apply</Button>
</SidePanel.Footer>
```
-->
