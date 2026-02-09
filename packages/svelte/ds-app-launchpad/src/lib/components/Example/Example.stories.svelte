<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Example from "./Example.svelte";

  const { Story } = defineMeta({
    title: "Components/Example",
    tags: ["autodocs"],
    component: Example,
  });
</script>

<Story name="Default" />