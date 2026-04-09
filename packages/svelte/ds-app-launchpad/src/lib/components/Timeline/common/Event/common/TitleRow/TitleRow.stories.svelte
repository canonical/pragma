<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { RelativeDateTime } from "../../../../../RelativeDateTime/index.js";
  import { Timeline } from "../../../../index.js";
  import TitleRow from "./TitleRow.svelte";

  const { Story } = defineMeta({
    title: "Components/Timeline/Event/TitleRow",
    tags: ["autodocs"],
    component: TitleRow,
    args: {
      leadingText: "Alvarez Daniella",
    },
    argTypes: {
      date: {
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

<Story name="Default">
  {#snippet template({ children: _, date: __, ...args })}
    <Timeline.Event.TitleRow {...args}>
      {#snippet date()}
        <RelativeDateTime date="2023-03-15" />
      {/snippet}
      added labels: Don't merge, Maintenance, Review: QA needed
    </Timeline.Event.TitleRow>
  {/snippet}
</Story>
