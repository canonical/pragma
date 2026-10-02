<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Button } from "../Button/index.js";
  import { Modal } from "./index.js";

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

  let open = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeLeft = $state(0);
  const onclick = () => {
    if (interval) clearInterval(interval);
    open = true;
    timeLeft = 5;
    interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        open = false;
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
      {#snippet children(closeProps, close)}
        <Modal.Header>Discard pending review?</Modal.Header>
        <Modal.Content>
          You have added 4 comments. Discarding the pending review will
          permanently delete them. Are you sure you want to continue?
        </Modal.Content>
        <Modal.Footer>
          <Button {...closeProps}>Keep review</Button>
          <Button
            onclick={() => {
              // doSomething();
              close();
            }}
            importance="primary"
            anticipation="destructive"
          >
            Discard review
          </Button>
        </Modal.Footer>
      {/snippet}
    </Modal>
  {/snippet}
</Story>

<Story
  name="Controlled via bindable open prop"
  args={{ closedby: "closerequest" }}
  argTypes={{ open: { control: false } }}
>
  {#snippet template({ children: _, trigger: __, open: ___, ...args })}
    <!-- 
      <script lang="ts">
        let open = $state(false);
        let interval: ReturnType<typeof setInterval> | null = null;
        let timeLeft = $state(0);
        const onclick = () => {
          if (interval) clearInterval(interval);
          open = true;
          timeLeft = 5;
          interval = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
              open = false;
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
            }
          }, 1000);
        };
      </script>
    -->

    <p style="margin-block-end: 0.5rem;">
      Modal is {open ? "open" : "closed"}
    </p>
    <Button {onclick}>Show timed modal</Button>
    <Modal
      bind:open
      onclose={() => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }}
      {...args}
    >
      <Modal.Header>Timed Modal</Modal.Header>
      <Modal.Content>
        The modal will close automatically in {timeLeft} seconds.
      </Modal.Content>
    </Modal>
  {/snippet}
</Story>
