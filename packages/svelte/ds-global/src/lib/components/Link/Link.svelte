<script lang="ts">
  import type { LinkProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds link";

  let { class: className, children, appearance, ...rest }: LinkProps = $props();
</script>

<a class={[componentCssClassName, className, appearance]} {...rest}>
  {@render children?.()}
</a>

<!-- @component
`Link` is a styled anchor element.

## Example Usage
```svelte
<Link href="https://ubuntu.com">
  Visit Ubuntu
</Link>
```

## Soft appearance
```svelte
<Link href="https://ubuntu.com" appearance="soft">
  Soft link
</Link>
```

## Router integration
Svelte has no polymorphic `as` prop equivalent. To use Link styling with a
router's `<a>` element (e.g. SvelteKit `<a href>` or a custom component),
apply the `ds link` classes directly or wrap the router element:

```svelte
{# SvelteKit: plain anchor, styled manually}
<a href="/about" class="ds link">About</a>

{# Or intercept navigation via onclick}
<Link href="/about" onclick={(e) => { e.preventDefault(); goto('/about'); }}>
  About
</Link>
```
-->
