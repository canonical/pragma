<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { SidePanel } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/SidePanel/Content/Header",
    tags: ["autodocs"],
    component: SidePanel.Content.Header,
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<Story name="Default" asChild>
  <SidePanel.Content.Header>Project settings</SidePanel.Content.Header>
</Story>

<Story name="With a dismiss button" asChild>
  <SidePanel.Content.Header>
    Project settings
    <SidePanel.Content.Header.CloseButton />
  </SidePanel.Content.Header>
</Story>
