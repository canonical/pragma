<script module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import AwesomeButton from "./AwesomeButton.svelte";

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: "AwesomeButton",
    tags: ["autodocs"],
    component: AwesomeButton,
  });
</script>

<!-- More on writing stories with args: https://storybook.js.org/docs/writing-stories/args -->
<Story name="Default" args={{ style: "padding: 12px 24px;", id: "button-1" }}>
  Button
</Story>

<Story
  name="Compact"
  args={{ style: "padding: 6px 12px; font-size: 12px;", id: "button-2" }}
>
  Small <em>Button</em>
</Story>
