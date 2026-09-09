<script lang="ts" module>
  import { ArchiveIcon } from "@canonical/svelte-icons";
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { fn } from "storybook/test";
  import { MODIFIER_FAMILIES } from "../../modifier-families/index.js";
  import Button from "./Button.svelte";
  import type { ButtonProps } from "./types.js";

  type MatrixColumn = {
    label: string;
    variant: {
      anticipation?: ButtonProps["anticipation"];
      emphasis?: ButtonProps["emphasis"];
    };
  };

  const MATRIX_COLUMNS: MatrixColumn[] = [
    { label: "default", variant: {} },
    ...MODIFIER_FAMILIES.anticipation.map((anticipation) => ({
      label: anticipation,
      variant: { anticipation },
    })),
    { label: "branded", variant: { emphasis: "branded" } },
  ];

  const MATRIX_ARG_TYPES = {
    importance: { control: false },
    anticipation: { control: false },
    emphasis: { control: false },
  } as const;

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

<Story name="Importance" argTypes={{ importance: { control: false } }}>
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

<Story name="Anticipation" argTypes={{ anticipation: { control: false } }}>
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

<Story name="Emphasis" args={{ emphasis: "branded" }}>
  {#snippet template(args)}
    <Button {...args} onclick={fn()}>branded</Button>
  {/snippet}
</Story>

<Story
  name="Matrix"
  tags={["!autodocs"]}
  argTypes={MATRIX_ARG_TYPES}
  args={{ disabled: false, loading: false }}
>
  {#snippet template(args)}
    {@render variantMatrix(args)}
  {/snippet}
</Story>

<Story name="Density" argTypes={{ density: { control: false } }}>
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

<Story name="Loading" argTypes={{ loading: { control: false } }}>
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

<Story
  name="As link"
  args={{
    href: "https://ubuntu.com",
  }}
>
  Link button
</Story>

{#snippet variantMatrix(props: ButtonProps)}
  <table class="matrix" aria-label="Button modifier combinations">
    <colgroup span="2"></colgroup>
    <colgroup span={MODIFIER_FAMILIES.anticipation.length}></colgroup>
    <colgroup></colgroup>
    <thead>
      <tr>
        <th scope="col" rowspan="2" style="vertical-align:bottom">importance</th>
        <th scope="col" rowspan="2" style="vertical-align:top">default</th>
        <th scope="colgroup" colspan={MODIFIER_FAMILIES.anticipation.length}>
          anticipation
        </th>
        <th scope="colgroup">emphasis</th>
      </tr>
      <tr>
        {#each MATRIX_COLUMNS.slice(1) as column (column.label)}
          <th scope="col">{column.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each MODIFIER_FAMILIES.importance as importance (importance)}
        <tr>
          <th scope="row">{importance}</th>
          {#each MATRIX_COLUMNS as column (column.label)}
            <td>
              <Button
                {...props}
                {importance}
                anticipation={column.variant.anticipation}
                emphasis={column.variant.emphasis}
              >
                Button
              </Button>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}

<style>
  .matrix {
    border-collapse: separate;
    border-spacing: var(--dimension-150);
    text-align: start;
  }

  .matrix th {
    font: var(--ds-typography-text-secondary);
    color: var(--color-text-muted);
    text-align: start;
  }
</style>
