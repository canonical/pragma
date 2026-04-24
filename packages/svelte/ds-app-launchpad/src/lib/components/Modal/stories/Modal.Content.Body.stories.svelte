<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Modal } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/Modal/Content/Body",
    tags: ["autodocs"],
    component: Modal.Content.Body,
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <Modal.Content.Body {...args}>
      This is the body of the dialog. It contains the main content.
    </Modal.Content.Body>
  {/snippet}
</Story>
