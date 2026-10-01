<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Modal } from "../../index.js";

  // TODO(button): Replace the native buttons with the DS Button once available.
  const { Story } = defineMeta({
    title: "_work_in_progress/pattern/Modal/Footer",
    tags: ["autodocs"],
    component: Modal.Footer,
    argTypes: {
      children: {
        control: { disable: true },
      },
    },
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, ...args })}
    <Modal.Footer {...args}>
      <button>Cancel</button>
      <button>Save</button>
    </Modal.Footer>
  {/snippet}
</Story>
