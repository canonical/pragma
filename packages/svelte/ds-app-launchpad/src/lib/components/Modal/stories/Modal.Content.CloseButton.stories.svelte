<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Modal } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/Modal/Content/Header/CloseButton",
    tags: ["autodocs"],
    component: Modal.Content.Header.CloseButton,
  });
</script>

<Story name="Default" asChild>
  <Modal.Content.Header.CloseButton />
</Story>
