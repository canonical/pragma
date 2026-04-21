<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Button } from "../Button/index.js";
  import Tooltip from "./Tooltip.svelte";

  const { Story } = defineMeta({
    title: "Components/Tooltip",
    tags: ["autodocs"],
    component: Tooltip,
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
  function scrollToCenter(el: HTMLElement) {
    el.scrollTo({ top: el.clientHeight / 2, left: el.clientWidth / 2 });
  }
</script>

<Story name="Default">
  {#snippet template({ trigger: _, children: __, ...args })}
    <div style="display: grid; place-items: center; min-height: 150px;">
      <Tooltip {...args}>
        {#snippet trigger(triggerProps)}
          <Button {...triggerProps}>Hover or focus me</Button>
        {/snippet}
        Hello there!
      </Tooltip>
    </div>
  {/snippet}
</Story>

<Story
  name="With different positions"
  argTypes={{ position: { control: false } }}
  args={{ autoAdjust: false }}
>
  {#snippet template({ trigger: _, children: __, position: ___, ...args })}
    <div
      style="padding: 4rem; display: grid; grid-template-columns: repeat(2, 1fr); row-gap: 4rem; place-items: center;"
    >
      {#each ["block-start", "block-end", "block-start span-inline-start", "block-start span-inline-end", "block-end span-inline-start", "block-end span-inline-end", "inline-start", "inline-end"] as const as position (position)}
        <Tooltip {position} {...args}>
          {#snippet trigger(triggerProps)}
            <Button {...triggerProps}>{position}</Button>
          {/snippet}
          Hello there!
        </Tooltip>
      {/each}
    </div>
  {/snippet}
</Story>

<Story
  name="With auto adjust"
  args={{
    position: "block-end span-inline-end",
    autoAdjust: true,
    delay: 0,
  }}
>
  {#snippet template({ trigger: _, children: __, ...args })}
    <div
      class="placeholder-box"
      style="height: 250px; overflow: auto;"
      use:scrollToCenter
    >
      <div
        style="height: 200%; width: 200%; display: grid; place-items: center; position: relative;"
      >
        <Tooltip {...args}>
          {#snippet trigger(triggerProps)}
            <Button {...triggerProps}>Click me</Button>
          {/snippet}
          And now scroll the container
        </Tooltip>
      </div>
    </div>
  {/snippet}
</Story>
