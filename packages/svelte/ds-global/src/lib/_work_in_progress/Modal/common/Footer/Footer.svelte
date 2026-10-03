<script lang="ts">
  import type { FooterProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds modal-footer";

  let { class: className, children, ...rest }: FooterProps = $props();
</script>

<div class={[componentCssClassName, className]} {...rest}>
  {@render children?.()}
</div>

<!-- TODO(button): Use the DS Button in the example once available. -->
<!-- @component
`Modal.Footer` holds the modal's actions, with the affirmative one last.

## Example Usage
```svelte
<Modal.Footer>
  <button {...closeProps}>Cancel</button>
  <button onclick={confirm}>Confirm</button>
</Modal.Footer>
```

@implements ds:global.subcomponent.modal-footer
-->
