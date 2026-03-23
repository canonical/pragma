<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import RelativeDateTime from "./RelativeDateTime.svelte";

  const { Story } = defineMeta({
    title: "Components/RelativeDateTime",
    tags: ["autodocs"],
    component: RelativeDateTime,
  });
</script>

<script lang="ts">
  const times = [
    1000 * 60 * 5, // 5 minutes
    1000 * 60 * 60 * 1.5, // 1.5 hour
    1000 * 60 * 60 * 24 * 1.5, // 1.5 days
    1000 * 60 * 60 * 24 * 7 * 1.5, // 1.5 week
  ];
</script>

<Story name="Now" args={{ date: new Date() }} />

<Story name="Past Dates" argTypes={{ date: { control: false } }}>
  {#snippet template(args)}
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      {#each times as time (time)}
        <RelativeDateTime {...args} date={Date.now() - time} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Future Dates" argTypes={{ date: { control: false } }}>
  {#snippet template(args)}
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      {#each times as time (time)}
        <RelativeDateTime {...args} date={Date.now() + time} />
      {/each}
    </div>
  {/snippet}
</Story>
