<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Button } from "../Button/index.js";
  import { SidePanel } from "./index.js";
  import type { SidePanelMethods } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/SidePanel",
    tags: ["autodocs"],
    component: SidePanel,
    argTypes: {
      trigger: {
        control: false,
      },
      children: {
        control: false,
      },
    },
  });

  let sidePanel = $state<SidePanelMethods>();
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeLeft = $state(0);
  const onclick = () => {
    if (!sidePanel) return;
    sidePanel.showModal();
    timeLeft = 5;
    interval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        sidePanel?.close();
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
    <SidePanel {...args}>
      {#snippet trigger(triggerProps)}
        <Button {...triggerProps}>Open side panel</Button>
      {/snippet}
      {#snippet children(commandfor)}
        <SidePanel.Content>
          <SidePanel.Content.Header>
            Job details
            <SidePanel.Content.Header.CloseButton
              {commandfor}
              command="close"
            />
          </SidePanel.Content.Header>
          <SidePanel.Content.Body>
            Inspect run history, owner, and retry policy without navigating away
            from the jobs list.
          </SidePanel.Content.Body>
        </SidePanel.Content>
      {/snippet}
    </SidePanel>
  {/snippet}
</Story>

<Story
  name="Controlled via instance methods"
  args={{ closeOnOutsideClick: false }}
>
  {#snippet template({ children: __, trigger: _, ...args })}
    <!-- 
    let sidePanel = $state<SidePanelMethods>();
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeLeft = $state(0);
    const onclick = () => {
      if (!sidePanel) return;
      sidePanel.showModal();
      timeLeft = 5;
      interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          sidePanel?.close();
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      }, 1000);
    };
    -->

    <Button {onclick}>Show timed side panel</Button>
    <SidePanel
      bind:this={sidePanel}
      onclose={() => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }}
      {...args}
    >
      <SidePanel.Content>
        <SidePanel.Content.Header>Timed Side Panel</SidePanel.Content.Header>
        <SidePanel.Content.Body>
          This side panel closes automatically in {timeLeft} seconds.
        </SidePanel.Content.Body>
      </SidePanel.Content>
    </SidePanel>
  {/snippet}
</Story>
