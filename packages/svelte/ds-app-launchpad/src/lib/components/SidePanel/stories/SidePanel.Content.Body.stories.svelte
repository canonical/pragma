<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { SidePanel } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/SidePanel/Content/Body",
    tags: ["autodocs"],
    component: SidePanel.Content.Body,
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <SidePanel.Content.Body {...args}>
      This is the side panel body where users can review details and make
      changes without leaving the current page.
    </SidePanel.Content.Body>
  {/snippet}
</Story>
