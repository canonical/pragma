<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Button } from "../../Button/index.js";
  import { Modal } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/Modal/Content",
    tags: ["autodocs"],
    component: Modal.Content,
  });
</script>

<Story name="Default" asChild>
  <Modal.Content>
    <Modal.Content.Header>
      Discard pending review?
      <Modal.Content.Header.CloseButton />
    </Modal.Content.Header>
    <Modal.Content.Body>
      You have added 4 comments. Discarding the pending review will permanently
      delete them. Are you sure you want to continue?
    </Modal.Content.Body>
    <Modal.Content.Footer>
      <Button>Keep review</Button>
      <Button severity="negative">Discard review</Button>
    </Modal.Content.Footer>
  </Modal.Content>
</Story>
