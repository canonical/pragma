<script module lang="ts">
  import { ForkIcon } from "@canonical/svelte-icons";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { RelativeDateTime } from "../../../RelativeDateTime/index.js";
  import { Timeline } from "../../index.js";
  import Event from "./Event.svelte";

  const { Story } = defineMeta({
    title: "Components/Timeline/Event",
    tags: ["autodocs"],
    component: Event,
    argTypes: {
      titleRow: {
        control: {
          disable: true,
        },
      },
      children: {
        control: {
          disable: true,
        },
      },
    },
  });
</script>

{#snippet date()}
  <RelativeDateTime date="2023-03-15" />
{/snippet}

<Story name="Default">
  {#snippet template({ children: _, titleRow: __, ...args })}
    <Timeline>
      <Timeline.Event {...args}>
        {#snippet titleRow()}
          <Timeline.Event.TitleRow leadingText="Alvarez Daniella" {date}>
            did something very special, that will be remembered forever
          </Timeline.Event.TitleRow>
        {/snippet}
        Description of the thing that was done
      </Timeline.Event>
    </Timeline>
  {/snippet}
</Story>

<Story
  name="With icon marker"
  argTypes={{
    markerSize: {
      control: false,
    },
    marker: {
      control: false,
    },
  }}
>
  {#snippet template({ children: _, titleRow: __, marker: ___, ...args })}
    <Timeline>
      <Timeline.Event {...args} markerSize="small">
        {#snippet marker()}
          <ForkIcon />
        {/snippet}
        {#snippet titleRow()}
          <Timeline.Event.TitleRow leadingText="Alvarez Daniella" {date}>
            next to a small icon marker
          </Timeline.Event.TitleRow>
        {/snippet}
      </Timeline.Event>
      <Timeline.Event {...args} markerSize="large">
        {#snippet marker()}
          <ForkIcon />
        {/snippet}
        {#snippet titleRow()}
          <Timeline.Event.TitleRow leadingText="Alvarez Daniella" {date}>
            next to a large icon marker
          </Timeline.Event.TitleRow>
        {/snippet}
      </Timeline.Event>
    </Timeline>
  {/snippet}
</Story>

<Story
  name="With a user avatar"
  argTypes={{
    markerSize: {
      control: false,
    },
  }}
  args={{
    marker: {
      userName: "Alvarez Daniella",
      userAvatarUrl: "https://assets.ubuntu.com/v1/fca94c45-snap+icon.png",
    },
  }}
>
  {#snippet template({ children: _, titleRow: __, ...args })}
    <Timeline>
      <Timeline.Event {...args} markerSize="small">
        {#snippet titleRow()}
          <Timeline.Event.TitleRow leadingText="Alvarez Daniella" {date}>
            next to a small user avatar
          </Timeline.Event.TitleRow>
        {/snippet}
      </Timeline.Event>
      <Timeline.Event {...args} markerSize="large">
        {#snippet titleRow()}
          <Timeline.Event.TitleRow leadingText="Alvarez Daniella" {date}>
            next to a large user avatar
          </Timeline.Event.TitleRow>
        {/snippet}
      </Timeline.Event>
    </Timeline>
  {/snippet}
</Story>

<Story name="With custom content">
  {#snippet template()}
    <Timeline>
      <Timeline.Event>
        <div
          class="placeholder-box"
          style="height: 150px; display: grid; place-content: center;"
        >
          Custom content goes here
        </div>
      </Timeline.Event>
    </Timeline>
  {/snippet}
</Story>
