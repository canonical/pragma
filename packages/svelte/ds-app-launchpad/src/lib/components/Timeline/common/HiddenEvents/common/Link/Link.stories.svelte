<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Timeline } from "../../../../index.js";

  const { Story } = defineMeta({
    title: "Components/Timeline/HiddenEvents/Link",
    tags: ["autodocs"],
    component: Timeline.HiddenEvents.Link,
    args: {
      href: "?showAll",
    },
    argTypes: {
      children: { control: { disable: true } },
    },
  });
</script>

<Story name="Default">
  {#snippet template(args)}
    <Timeline.HiddenEvents.Link {...args}>Show all</Timeline.HiddenEvents.Link>
  {/snippet}
</Story>
