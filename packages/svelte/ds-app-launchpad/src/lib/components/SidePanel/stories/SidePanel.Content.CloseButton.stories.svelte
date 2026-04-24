<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { SidePanel } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/SidePanel/Content/Header/CloseButton",
    tags: ["autodocs"],
    component: SidePanel.Content.Header.CloseButton,
  });
</script>

<Story name="Dismiss" asChild>
  <SidePanel.Content.Header.CloseButton />
</Story>
