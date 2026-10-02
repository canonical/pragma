<script lang="ts">
  import type { ContentProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds modal-content";

  let { class: className, children, ...rest }: ContentProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</div>

<!-- @component
`Modal.Content` holds the modal's main information. It is the only part that scrolls, so the header and footer stay put on long content.

## Example Usage
```svelte
<Modal.Content>Main content</Modal.Content>
```

@implements ds:global.subcomponent.modal-content
-->
