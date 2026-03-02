<script module lang="ts">
  import { ChevronDownIcon, ChevronUpIcon } from "@canonical/svelte-icons";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ToggleEventHandler } from "svelte/elements";
  import { Button } from "../Button/index.js";
  import Popover from "./Popover.svelte";
  import type { PopoverMethods } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/Popover",
    tags: ["autodocs"],
    component: Popover,
    argTypes: {
      trigger: {
        control: false,
      },
      children: {
        control: false,
      },
    },
  });
</script>

<script lang="ts">
  let popover = $state<PopoverMethods>();
  let timeLeft = $state(0);
  const ontoggle: ToggleEventHandler<HTMLDivElement> = (e) => {
    if (e.newState === "open") {
      timeLeft = 5;
      const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          popover?.hidePopover();
          clearInterval(interval);
        }
      }, 1000);
    }
  };

  const positionedPopovers = $state<PopoverMethods[]>([]);
</script>

<Story name="Default">
  {#snippet template({ trigger: _, children: __, ...args })}
    <Popover {...args}>
      {#snippet trigger(triggerProps, open)}
        <Button {...triggerProps}>
          {open ? "Close Popover" : "Open Popover"}
          {#snippet iconRight()}
            {#if open}
              <ChevronDownIcon />
            {:else}
              <ChevronUpIcon />
            {/if}
          {/snippet}
        </Button>
      {/snippet}
      This is content of the popover.
    </Popover>
  {/snippet}
</Story>

<Story
  name="Imperatively controlled"
  argTypes={{
    children: { control: false },
  }}
  args={{
    popover: "manual",
  }}
>
  {#snippet template({ children: _, trigger: __, ...args })}
    <!--
    <script lang="ts">
      let popover = $state<PopoverMethods>();
      let timeLeft = $state(0);
      const ontoggle: ToggleEventHandler<HTMLDivElement> = (e) => {
        if (e.newState === "open") {
          timeLeft = 5;
          const interval = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
              popover?.hidePopover();
              clearInterval(interval);
            }
          }, 1000);
        }
      };
    </script>
    -->

    <Popover {...args} bind:this={popover} {ontoggle}>
      {#snippet trigger(triggerProps, open)}
        <Button {...triggerProps} disabled={open}>
          Open Popover
          {#snippet iconRight()}
            {#if open}
              <ChevronDownIcon />
            {:else}
              <ChevronUpIcon />
            {/if}
          {/snippet}
        </Button>
      {/snippet}
      This popover will close automatically in {timeLeft} seconds.
    </Popover>
  {/snippet}
</Story>

<Story
  name="With customized position"
  args={{ popover: "manual" }}
  argTypes={{
    position: { table: { disable: true } },
  }}
>
  {#snippet template({ children: _, trigger: __, ...args })}
    <Button
      onclick={() => positionedPopovers.forEach((p) => p.togglePopover())}
      style="margin-bottom: 2rem; margin-inline: auto; display: block;"
    >
      Toggle all popovers
    </Button>
    <div
      style="display: grid; grid-template-columns: repeat(2, 1fr); place-items: center; gap: 4rem;"
    >
      {#each ["block-start span-inline-start", "block-end span-inline-start", "block-start span-inline-end", "block-end span-inline-end", "block-start", "block-end", "inline-start", "inline-end"] as const as position, i (position)}
        <Popover {...args} {position} bind:this={positionedPopovers[i]}>
          {#snippet trigger(triggerProps, open)}
            <Button {...triggerProps}>{open ? "Close" : "Open"}</Button>
          {/snippet}
          I'm <code>{position}</code>!
        </Popover>
      {/each}
    </div>
  {/snippet}
</Story>

<Story
  name="Fallback positioned"
  args={{
    position: "block-end span-inline-end",
    positionTryFallbacks: "flip-inline",
  }}
>
  {#snippet template({ children: _, trigger: __, ...args })}
    <div
      style="display: flex; justify-content: flex-end; align-items: start; min-height: 150px;"
    >
      <Popover {...args}>
        {#snippet trigger(triggerProps)}
          <Button {...triggerProps}>Toggle</Button>
        {/snippet}
        <p
          style="width: min(500px, 100vh); border: 1px solid var(--lp-color-border-default);"
        >
          This is a wide popover content that could overflow the viewport on the
          inline-end side. The popover will attempt to flip the content to the
          opposite side to avoid the overflow. Resize the viewport if necessary.
        </p>
      </Popover>
    </div>
  {/snippet}
</Story>
