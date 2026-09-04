<script lang="ts" module>
  import { ArchiveIcon } from "@canonical/svelte-icons";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { fn } from "storybook/test";
  import type { ModifierFamilyValues } from "../../modifier-families/index.js";
  import { MODIFIER_FAMILIES } from "../../modifier-families/index.js";
  import Button from "./Button.svelte";

  type ButtonVariant = {
    importance?: ModifierFamilyValues["importance"];
    anticipation?: ModifierFamilyValues["anticipation"];
    emphasis?: Extract<ModifierFamilyValues["emphasis"], "branded">;
    criticality?: Extract<ModifierFamilyValues["criticality"], "information">;
  };

  type MatrixColumn = {
    label: string;
    variant: ButtonVariant;
  };

  const MATRIX_COLUMNS: MatrixColumn[] = [
    { label: "default", variant: {} },
    ...MODIFIER_FAMILIES.anticipation.map((anticipation) => ({
      label: anticipation,
      variant: { anticipation },
    })),
    { label: "information", variant: { criticality: "information" } },
    { label: "branded", variant: { emphasis: "branded" } },
  ];

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

{#snippet variantMatrix(props: { disabled?: boolean; loading?: boolean })}
  <div class="matrix">
    <span></span>
    {#each MATRIX_COLUMNS as column (column.label)}
      <span class="matrix-label">{column.label}</span>
    {/each}
    {#each MODIFIER_FAMILIES.importance as importance (importance)}
      <span class="matrix-label">{importance}</span>
      {#each MATRIX_COLUMNS as column (column.label)}
        <Button {importance} {...column.variant} {...props}>Button</Button>
      {/each}
    {/each}
  </div>
{/snippet}

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

<Story name="Importance">
  {#snippet template(args)}
    <div class="row">
      {#each MODIFIER_FAMILIES.importance as importance (importance)}
        <Button {...args} {importance} onclick={fn()}>
          {importance}
        </Button>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Anticipation">
  {#snippet template(args)}
    <div class="row">
      {#each MODIFIER_FAMILIES.anticipation as anticipation (anticipation)}
        <Button {...args} {anticipation} onclick={fn()}>
          {anticipation}
        </Button>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Criticality">
  {#snippet template(args)}
    <Button {...args} criticality="information" onclick={fn()}>
      information
    </Button>
  {/snippet}
</Story>

<Story name="Emphasis">
  {#snippet template(args)}
    <Button {...args} emphasis="branded" onclick={fn()}>branded</Button>
  {/snippet}
</Story>

<Story name="Matrix">
  {#snippet template()}
    {@render variantMatrix({})}
  {/snippet}
</Story>

<Story name="Density">
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
    <p style="font-size: 12px; color: var(--color-text-muted);">
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

<Story name="Disabled matrix">
  {#snippet template()}
    {@render variantMatrix({ disabled: true })}
  {/snippet}
</Story>

<Story name="Loading matrix">
  {#snippet template()}
    {@render variantMatrix({ loading: true })}
    <div class="row loading-disabled">
      <Button importance="primary" anticipation="destructive" loading disabled>
        loading + disabled
      </Button>
    </div>
  {/snippet}
</Story>

<Story
  name="As link"
  args={{
    href: "https://ubuntu.com",
  }}
>
  Link button
</Story>

<style>
  .matrix {
    display: grid;
    grid-template-columns: repeat(7, max-content);
    gap: var(--dimension-150);
    align-items: center;
    justify-items: start;
  }

  .matrix-label {
    font: var(--ds-typography-text-secondary);
    color: var(--color-text-muted);
  }

  .loading-disabled {
    margin-block-start: var(--dimension-150);
  }
</style>
