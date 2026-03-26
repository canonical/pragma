<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { MODIFIER_FAMILIES } from "../../modifier-families/index.js";
  import NumberInput from "./NumberInput.svelte";

  const { Story } = defineMeta({
    title: "Components/NumberInput",
    tags: ["autodocs"],
    component: NumberInput,
  });
</script>

<script lang="ts">
  let value = $state(42);
</script>

<Story name="Default" args={{ placeholder: "Enter number..." }} />

<Story name="Severities" argTypes={{ severity: { table: { disable: true } } }}>
  {#snippet template({ severity: _, ...args })}
    <div
      style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
    >
      {#each MODIFIER_FAMILIES.severity as severity (severity)}
        <NumberInput {severity} placeholder={severity || "default"} {...args} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Densities" argTypes={{ density: { table: { disable: true } } }}>
  {#snippet template({ density: _, ...args })}
    <div
      style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
    >
      {#each ["dense", "medium"] as const as density (density)}
        <NumberInput {density} placeholder={density} {...args} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story
  name="With bound value"
  argTypes={{ value: { table: { disable: true } } }}
>
  {#snippet template({ value: _, ...args })}
    <!--
			<script lang="ts">
				let value = $state(42);
			</script>
		-->
    <NumberInput bind:value {...args} />
    <span style="margin-inline-start: 0.5rem;">Current value: {value}</span>
  {/snippet}
</Story>

<Story
  name="Invalid state"
  args={{
    required: true,
    min: 0,
    max: 10,
    placeholder: "Enter a number greater than 10 and unfocus",
    style: "width: 380px;",
  }}
/>
