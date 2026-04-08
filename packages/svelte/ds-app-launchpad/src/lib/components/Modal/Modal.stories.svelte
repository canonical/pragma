<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Button } from "../Button/index.js";
  import { Modal } from "./index.js";
  import type { ModalMethods } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/Modal",
    tags: ["autodocs"],
    component: Modal,
    argTypes: {
      trigger: {
        control: false,
      },
      children: {
        control: false,
      },
    },
  });

  let modal = $state<ModalMethods>();
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeLeft = $state(0);
  const onclick = () => {
    if (!modal) return;
    modal.showModal();
    timeLeft = 5;
    interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        modal?.close();
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    }, 1000);
  };
</script>

<Story name="Default">
  {#snippet template({ children: _, trigger: __, ...args })}
    <Modal {...args}>
      {#snippet trigger(triggerProps)}
        <Button {...triggerProps}>Show modal</Button>
      {/snippet}
      {#snippet children(commandfor, close)}
        <Modal.Content>
          <Modal.Content.Header>
            Discard pending review?
            <Modal.Content.Header.CloseButton {commandfor} command="close" />
          </Modal.Content.Header>
          <Modal.Content.Body>
            You have added 4 comments. Discarding the pending review will
            permanently delete them. Are you sure you want to continue?
          </Modal.Content.Body>
          <Modal.Content.Footer>
            <Button {commandfor} command="close">Keep review</Button>
            <Button
              onclick={() => {
                // doSomething();
                close();
              }}
              severity="negative"
            >
              Discard review
            </Button>
          </Modal.Content.Footer>
        </Modal.Content>
      {/snippet}
    </Modal>
  {/snippet}
</Story>

<Story
  name="Controlled via instance methods"
  args={{ closeOnOutsideClick: false }}
>
  {#snippet template({ children: __, trigger: _, ...args })}
    <!-- 
    let modal = $state<ModalMethods>();
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeLeft = $state(0);
    const onclick = () => {
      if (!modal) return;
      modal.showModal();
      timeLeft = 5;
      interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          modal?.close();
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      }, 1000);
    };
    -->

    <Button {onclick}>Show timed modal</Button>
    <Modal
      bind:this={modal}
      onclose={() => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }}
      {...args}
    >
      <Modal.Content>
        <Modal.Content.Header>Timed Modal</Modal.Content.Header>
        <Modal.Content.Body>
          The modal will close automatically in {timeLeft} seconds.
        </Modal.Content.Body>
      </Modal.Content>
    </Modal>
  {/snippet}
</Story>
