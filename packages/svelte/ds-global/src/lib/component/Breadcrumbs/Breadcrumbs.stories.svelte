<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Breadcrumbs from "./Breadcrumbs.svelte";

  const { Story } = defineMeta({
    title: "Components/Breadcrumbs",
    component: Breadcrumbs,
    tags: ["autodocs"],
    argTypes: {
      render: {
        control: false,
      },
    },
  });
</script>

<!-- Default breadcrumbs with three levels of navigation. -->
<Story
  name="Default"
  args={{
    items: [
      { url: "/", label: "Home" },
      { url: "/products", label: "Products" },
      { key: "details", label: "Product Details", current: true },
    ],
  }}
/>

<!-- Breadcrumbs with only two levels. -->
<Story
  name="TwoLevels"
  args={{
    items: [
      { url: "/", label: "Home" },
      { key: "about", label: "About", current: true },
    ],
  }}
/>

<!-- Breadcrumbs with deep navigation hierarchy. -->
<Story
  name="ManyLevels"
  args={{
    items: [
      { url: "/", label: "Ubuntu" },
      { url: "/server", label: "Server" },
      { url: "/server/docs", label: "Docs" },
      { url: "/server/docs/installation", label: "Installation" },
      { key: "autoinstall", label: "Autoinstall", current: true },
    ],
  }}
/>

<!--
Breadcrumbs using a custom separator character.

Note: the `separator` prop is not part of the core api.
-->
<Story
  name="CustomSeparator"
  args={{
    separator: "›",
    items: [
      { url: "/", label: "Home" },
      { url: "/products", label: "Products" },
      { key: "details", label: "Details", current: true },
    ],
  }}
/>

<!--
Breadcrumbs rendering each item through a custom `render` snippet instead of
the default `Breadcrumbs.Item`.

Custom renderers must render the separator BEFORE the link so that on wrap
the separator starts the new line; it's hidden on the last item via CSS.
-->
<Story
  name="WithCustomRender"
  args={{
    items: [
      { url: "/", label: "Home" },
      { url: "/docs", label: "Documentation" },
      { key: "api", label: "API Reference", current: true },
    ],
  }}
>
  {#snippet template({ render: _render, ...args })}
    <Breadcrumbs {...args}>
      {#snippet render(item)}
        <li class="ds breadcrumbs-item">
          <span class="separator" aria-hidden="true">/</span>
          {#if item.current}
            <strong class="link" aria-current="page">{item.label}</strong>
          {:else}
            <a
              class="link"
              href={item.url}
              style="text-decoration: underline;"
            >
              {item.label}
            </a>
          {/if}
        </li>
      {/snippet}
    </Breadcrumbs>
  {/snippet}
</Story>

<!-- Breadcrumbs with custom aria-label for accessibility. -->
<Story
  name="WithCustomAriaLabel"
  args={{
    "aria-label": "You are here",
    items: [
      { url: "/", label: "Home" },
      { key: "settings", label: "Settings", current: true },
    ],
  }}
/>
