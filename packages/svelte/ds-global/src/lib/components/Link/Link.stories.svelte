<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Link from "./Link.svelte";

  const { Story } = defineMeta({
    title: "Stable/Link",
    component: Link,
    tags: ["autodocs"],
    argTypes: {
      children: {
        control: { type: "text" },
        description: "Content to display in the link.",
      },
      href: {
        control: { type: "text" },
        description: "Link URL.",
      },
      appearance: {
        // todo(jmuzina, advl) there is some regression in tokens that we need to adjust in both React/Svelte links
        // in order to fix color of link text.
        options: ["neutral", "soft"],
        control: { type: "radio" },
        description: "Link appearance modifier.",
      },
    },
    args: {
      href: "https://ubuntu.com",
    },
  });
</script>

<!-- Default link -->
<Story name="Default">Visit Ubuntu</Story>

<!--
  Soft links appear like normal text until interacted with.
  Useful for inline navigation that should not visually dominate the surrounding copy.
-->
<Story name="Soft" args={{ appearance: "soft" }}>Soft link</Story>
