<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import DateTime from "./DateTime.svelte";

  const { Story } = defineMeta({
    title: "Components/DateTime",
    tags: ["autodocs"],
    component: DateTime,
    args: {
      date: "2023-10-01T12:00:00Z",
    },
  });
</script>

<Story name="Default" />

<Story
  name="Custom Intl formatter"
  args={{
    formatter: new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "long",
    }),
  }}
/>

<Story
  name="Custom formatter function"
  args={{
    formatter: {
      format: (date: Date) => `${date.getTime()} since epoch`,
    },
  }}
/>
