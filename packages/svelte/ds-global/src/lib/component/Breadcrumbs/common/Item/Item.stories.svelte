<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Item from "./Item.svelte";
  import type { ItemProps } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/Breadcrumbs/Item",
    component: Item,
    tags: ["autodocs"],
    render,
    parameters: {
      docs: {
        description: {
          component:
            "A single breadcrumb item with link and separator. Renders as a link by default, or as text when `current` or `disabled` is true. Implements `ds:global.subcomponent.breadcrumbs-item`.",
        },
      },
    },
    argTypes: {
      label: {
        control: { type: "text" },
        description: "The link text label.",
      },
      url: {
        control: { type: "text" },
        description: "The URL to navigate to when clicked.",
      },
      current: {
        control: { type: "boolean" },
        description:
          "Whether this is the current/active breadcrumb. Renders as text instead of link.",
      },
      disabled: {
        control: { type: "boolean" },
        description:
          "Whether the breadcrumb is disabled. Renders as text instead of link.",
      },
      separator: {
        control: { type: "text" },
        description: "Custom separator character or snippet.",
      },
    },
  });
</script>

<!-- Items are rendered inside the list landmark Breadcrumbs provides. -->
{#snippet render(args: ItemProps)}
  <nav aria-label="Breadcrumb">
    <ol
      class="ds breadcrumbs"
      style="display: flex; list-style: none; padding: 0; margin: 0; gap: 0.5rem;"
    >
      <Item {...args} />
    </ol>
  </nav>
{/snippet}

<!-- Default breadcrumb item with link. -->
<Story
  name="Default"
  args={{
    label: "Products",
    url: "/products",
  }}
/>

<!-- Current/active breadcrumb item (renders as text, not link). -->
<Story
  name="Current"
  args={{
    label: "Product Details",
    current: true,
  }}
/>

<!-- Disabled breadcrumb item. -->
<Story
  name="Disabled"
  args={{
    label: "Unavailable Section",
    url: "/unavailable",
    disabled: true,
  }}
/>

<!-- Breadcrumb item with custom separator. -->
<Story
  name="CustomSeparator"
  args={{
    label: "Documentation",
    url: "/docs",
    separator: "›",
  }}
/>

<!-- Breadcrumb item using children instead of label. -->
<Story name="WithChildren">
  {#snippet template(args: ItemProps)}
    <nav aria-label="Breadcrumb">
      <ol
        class="ds breadcrumbs"
        style="display: flex; list-style: none; padding: 0; margin: 0; gap: 0.5rem;"
      >
        <Item {...args} url="/">
          <span style="display: flex; align-items: center; gap: 0.25rem;">
            <span aria-hidden="true">🏠</span>
            Home
          </span>
        </Item>
      </ol>
    </nav>
  {/snippet}
</Story>
