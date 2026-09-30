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

The separator is rendered AFTER the link, same as the default `Item`, so it
stays hidden on the last item via the existing `:last-of-type` CSS rule.
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
          <span class="separator" aria-hidden="true">/</span>
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
