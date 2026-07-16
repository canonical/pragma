<script lang="ts">
  import { getItemId } from "@canonical/utils";
  import { Item } from "./common/index.js";
  import type { BreadcrumbsProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds breadcrumbs";

  let {
    items,
    render,
    separator = "/",
    class: className,
    "aria-label": ariaLabel = "Breadcrumb",
    ...rest
  }: BreadcrumbsProps = $props();
</script>

<nav
  class={[componentCssClassName, className]}
  aria-label={ariaLabel}
  {...rest}
>
  <ol class="list p">
    {#each items as item (getItemId(item))}
      {#if render}
        {@render render(item)}
      {:else}
        <Item {...item} {separator} />
      {/if}
    {/each}
  </ol>
</nav>

<!-- @component
Breadcrumbs are a navigational aid that shows users their current location
within a site's information architecture. They provide a clear path from the
root of the information architecture (IA) to the current page, allowing users
to quickly understand where they are and easily navigate back to previous
levels in the IA. Breadcrumbs should reflect the IA, not the user's path
they took to arrive at the current page. They work best in websites or
applications with multiple levels of hierarchy and are particularly useful
when users might arrive at deep pages through search or external links.

`import { Breadcrumbs } from "@canonical/svelte-ds-global";`

## Example Usage
```svelte
<Breadcrumbs
  items={[
    { url: "/", label: "Home" },
    { url: "/products", label: "Products" },
    { key: "details", label: "Product Details", current: true },
  ]}
/>
```

@implements ds:global.pattern.breadcrumbs
-->
