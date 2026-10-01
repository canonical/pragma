<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { setModalContext } from "../../context.js";
  import { Modal } from "../../index.js";

  const { Story } = defineMeta({
    title: "_work_in_progress/pattern/Modal/Header",
    tags: ["autodocs"],
    component: Modal.Header,
    argTypes: {
      children: {
        control: { disable: true },
      },
      closeButton: {
        control: { disable: true },
      },
    },
  });
</script>

<script lang="ts">
  setModalContext({
    id: "modal-header-story",
    titleId: "modal-header-story-title",
  });
</script>

<Story name="Default">
  {#snippet template({ children: _, closeButton: __, ...args })}
    <Modal.Header {...args}>Modal title</Modal.Header>
  {/snippet}
</Story>

<Story name="Without a close button">
  {#snippet template({ children: _, closeButton: __, ...args })}
    <Modal.Header {...args} closeButton={false}>Modal title</Modal.Header>
  {/snippet}
</Story>

<!-- Pass a snippet to `closeButton` to render your own close button or to customize the default `Modal.Header.CloseButton` -->

<Story name="With a custom close button">
  {#snippet template({ children: _, closeButton: __, ...args })}
    <Modal.Header {...args}>
      Modal title
      {#snippet closeButton()}
        <Modal.Header.CloseButton disabled class="my-class" />
      {/snippet}
    </Modal.Header>
  {/snippet}
</Story>
