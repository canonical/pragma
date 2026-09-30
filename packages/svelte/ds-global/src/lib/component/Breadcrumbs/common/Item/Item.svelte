<script lang="ts">
  import type { ItemProps } from "./types.js";
  import "./styles.css";

  const componentCssClassName = "ds breadcrumbs-item";

  let {
    children,
    label,
    url,
    current = false,
    separator = "/",
    disabled = false,
    class: className,
    // key is used for Breadcrumbs' {#each} keying, not a DOM attribute
    key: _key,
    ...rest
  }: ItemProps = $props();
</script>

{#snippet content()}
  {#if children}
    {@render children()}
  {:else}
    {label}
  {/if}
{/snippet}

<li
  class={[
    componentCssClassName,
    current && "current",
    disabled && "disabled",
    className,
  ]}
>
  <!-- edges[0]: link (cardinality: 1, slotName: default) -->
  {#if current || disabled}
    <!--
      `aria-disabled` is only honored by AT on elements with a widget role
      a bare `<span>` has none, so `role="link"` is added when disabled to
      give it the role this item represents.
      This way, the disabled item is announced as a disabled link.
    -->
    <span
      class="link"
      aria-current={current ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      role={disabled ? "link" : undefined}
    >
      {@render content()}
    </span>
  {:else}
    <a class="link" href={url} {...rest}>
      {@render content()}
    </a>
  {/if}
  <!-- edges[1]: separator - hidden on last item via CSS -->
  <span class="separator" aria-hidden="true">
    {#if typeof separator === "string"}
      {separator}
    {:else}
      {@render separator()}
    {/if}
  </span>
</li>

<!-- @component
Default breadcrumb item renderer.

Extra attributes on an item (e.g. `target`, `data-sveltekit-preload-data`,
event handlers) are forwarded straight to the rendered link — no custom
`LinkComponent` needed. Can still be fully replaced per-item by providing a
custom `render` snippet on the Item.

@implements ds:global.subcomponent.breadcrumbs-item
-->
