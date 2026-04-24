<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Button } from "../../Button/index.js";
  import { Modal } from "../index.js";

  const { Story } = defineMeta({
    title: "Components/Modal/Content/Footer",
    tags: ["autodocs"],
    component: Modal.Content.Footer,
  });
</script>

<Story name="Default" asChild>
  <Modal.Content.Footer>
    <Button>Cancel</Button>
    <Button severity="positive">Save</Button>
  </Modal.Content.Footer>
</Story>
