<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Timeline } from "../../index.js";
  import HiddenEvents from "./HiddenEvents.svelte";

  const { Story } = defineMeta({
    title: "Components/Timeline/HiddenEvents",
    tags: ["autodocs"],
    component: HiddenEvents,
    args: {
      numHidden: 888,
    },
  });
</script>

{#snippet dummyChild()}
  <div style="width: var(--lp-dimension-size-l)"></div>
{/snippet}

<Story name="Default">
  {#snippet template(args)}
    <Timeline>
      <Timeline.HiddenEvents {...args}>
        <Timeline.HiddenEvents.Link href="?showAll"
          >Show all</Timeline.HiddenEvents.Link
        >
      </Timeline.HiddenEvents>
    </Timeline>
  {/snippet}
</Story>

<Story name="With two links">
  {#snippet template(args)}
    <Timeline>
      <Timeline.HiddenEvents {...args}>
        <Timeline.HiddenEvents.Link href="?showMore"
          >Show more</Timeline.HiddenEvents.Link
        >
        <Timeline.HiddenEvents.Link href="?showAll"
          >Show all</Timeline.HiddenEvents.Link
        >
      </Timeline.HiddenEvents>
    </Timeline>
  {/snippet}
</Story>

<Story name="At the start of the timeline">
  {#snippet template(args)}
    <Timeline>
      <Timeline.HiddenEvents {...args}>
        <Timeline.HiddenEvents.Link href="?showAll"
          >Show all</Timeline.HiddenEvents.Link
        >
      </Timeline.HiddenEvents>
      {@render dummyChild()}
    </Timeline>
  {/snippet}
</Story>

<Story name="At the end of the timeline">
  {#snippet template(args)}
    <Timeline>
      {@render dummyChild()}
      <Timeline.HiddenEvents {...args}>
        <Timeline.HiddenEvents.Link href="?showAll"
          >Show all</Timeline.HiddenEvents.Link
        >
      </Timeline.HiddenEvents>
    </Timeline>
  {/snippet}
</Story>

<Story name="In the middle of the timeline">
  {#snippet template(args)}
    <Timeline>
      {@render dummyChild()}
      <Timeline.HiddenEvents {...args}>
        <Timeline.HiddenEvents.Link href="?showMore"
          >Show more</Timeline.HiddenEvents.Link
        >
        <Timeline.HiddenEvents.Link href="?showAll"
          >Show all</Timeline.HiddenEvents.Link
        >
      </Timeline.HiddenEvents>
      {@render dummyChild()}
    </Timeline>
  {/snippet}
</Story>
