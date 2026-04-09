<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import BotIcon from "./BotIcon.svelte";
  import * as icons from "./index.js";

  const { Story } = defineMeta({
    title: "Components/Icons",
    tags: ["autodocs"],
    component: BotIcon,
  });
</script>

<Story name="Default" />

<Story name="Of different sizes" asChild>
  <div style="display: flex; align-items: center; gap: 8px;">
    {#each { length: 10 }, i (i)}
      <BotIcon style="font-size: {(i + 1) * 0.2}rem;" />
    {/each}
  </div>
</Story>

<Story name="With custom color" args={{ style: "color: red;" }} />

<!-- 
Additional icons that extend the base icon set provided by [@canonical/svelte-icons](https://github.com/canonical/svelte-icons).
-->

<Story name="Additional icons" asChild>
  <div
    style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1em;"
  >
    {#each Object.entries(icons) as [iconName, IconComponent] (iconName)}
      <div style="display: flex; gap: 0.5em; align-items: center;">
        <IconComponent />
        <span>{iconName}</span>
      </div>
    {/each}
  </div>
</Story>
