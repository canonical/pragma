<script lang="ts" module>
  import { ArchiveIcon } from "@canonical/svelte-icons";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { fn } from "storybook/test";
  import { MODIFIER_FAMILIES } from "../../modifier-families/index.js";
  import Button from "./Button.svelte";
  import type { ButtonProps } from "./types.js";

  const BUTTON_SEVERITIES = [
    "brand",
    "base",
    ...MODIFIER_FAMILIES.severity,
  ] as const satisfies readonly NonNullable<ButtonProps["severity"]>[];

  const { Story } = defineMeta({
    title: "Components/Button",
    component: Button,
    tags: ["autodocs"],
  });

  let loading = $state(false);
  const toggleLoading = () => {
    loading = !loading;
    setTimeout(() => {
      loading = !loading;
    }, 2000);
  };
</script>

<Story
  name="Default"
  args={{
    onclick: fn(),
  }}
>
  {#snippet template(args)}
    <Button {...args}>Button</Button>
  {/snippet}
</Story>

<Story name="Severities">
  {#snippet template(args)}
    <div class="row">
      {#each BUTTON_SEVERITIES as severity (severity)}
        <Button {...args} {severity} onclick={fn()}>
          {severity}
        </Button>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Densities">
  {#snippet template(args)}
    <div class="row">
      {#each MODIFIER_FAMILIES.density as density (density)}
        <Button {...args} {density} onclick={fn()}>
          {density}
        </Button>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="With icons">
  {#snippet template(args)}
    <div class="row">
      <Button {...args} onclick={fn()}>
        {#snippet iconLeft()}
          <ArchiveIcon />
        {/snippet}
        With left icon
      </Button>
      <Button {...args} onclick={fn()}>
        With right icon
        {#snippet iconRight()}
          <ArchiveIcon />
        {/snippet}
      </Button>
      <Button {...args} onclick={fn()}>
        {#snippet iconLeft()}
          <ArchiveIcon />
        {/snippet}
        Both icons
        {#snippet iconRight()}
          <ArchiveIcon />
        {/snippet}
      </Button>
    </div>
  {/snippet}
</Story>

<Story name="Icon only">
  {#snippet template(args)}
    <Button {...args} onclick={fn()}>
      {#snippet iconLeft()}
        <ArchiveIcon />
      {/snippet}
    </Button>
  {/snippet}
</Story>

<Story name="Loading">
  {#snippet template(args)}
    <div class="row">
      <Button {...args} {loading} onclick={toggleLoading}>Click to load</Button>
      <br />
      <br />
    </div>
    <p style="font-size: 12px; color: var(--lp-color-text-muted);">
      Click the button to toggle the loading state.
    </p>
  {/snippet}
</Story>

<Story
  name="Disabled"
  args={{
    disabled: true,
  }}
>
  Disabled button
</Story>

<Story
  name="As link"
  args={{
    href: "https://ubuntu.com",
  }}
>
  Link button
</Story>

<Story name="Brand with icon">
  {#snippet template(args)}
    <Button {...args} severity="brand" onclick={fn()}>
      {#snippet iconLeft()}
        <ArchiveIcon />
      {/snippet}
      Brand action
    </Button>
  {/snippet}
</Story>
