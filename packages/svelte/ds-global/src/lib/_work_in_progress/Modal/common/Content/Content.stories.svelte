<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Modal } from "../../index.js";

  const { Story } = defineMeta({
    title: "_work_in_progress/pattern/Modal/Content",
    tags: ["autodocs"],
    component: Modal.Content,
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <Modal.Content {...args}>
      This is the content of the modal. It contains the main information.
    </Modal.Content>
  {/snippet}
</Story>
