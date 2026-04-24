<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Modal } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/Modal/Content/Header",
    tags: ["autodocs"],
    component: Modal.Content.Header,
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<Story name="Default" asChild>
  <Modal.Content.Header>This is a dialog header</Modal.Content.Header>
</Story>

<Story name="With a close button" asChild>
  <Modal.Content.Header>
    This is a dialog header
    <Modal.Content.Header.CloseButton />
  </Modal.Content.Header>
</Story>
