<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Breadcrumbs from "./Breadcrumbs.svelte";

  const { Story } = defineMeta({
    title: "Components/Breadcrumbs",
    component: Breadcrumbs,
    tags: ["autodocs"],
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
