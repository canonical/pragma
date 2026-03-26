<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { MODIFIER_FAMILIES } from "../../modifier-families/index.js";
  import TextInput from "./TextInput.svelte";

  const { Story } = defineMeta({
    title: "Components/TextInput",
    tags: ["autodocs"],
    component: TextInput,
    argTypes: {
      disabled: {
        control: { type: "boolean" },
        description: "Disables the text input, preventing user interaction.",
        table: {
          type: { summary: "boolean" },
          category: "properties",
        },
      },
      placeholder: {
        control: { type: "text" },
        description: "The placeholder text for the input.",
        table: {
          category: "properties",
        },
      },
    },
  });
</script>

<script lang="ts">
  let value = $state("Hello world");
</script>

<Story name="Default" args={{ placeholder: "Enter text..." }} />

<Story name="Types" argTypes={{ type: { table: { disable: true } } }}>
  {#snippet template({ type: _, ...args })}
    <div
      style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
    >
      {#each ["text", "password", "email", "url", "tel", "search"] as const as type (type)}
        <TextInput {type} placeholder={type} {...args} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Severities" argTypes={{ severity: { table: { disable: true } } }}>
  {#snippet template({ severity: _, ...args })}
    <div
      style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;"
    >
      {#each MODIFIER_FAMILIES["severity"] as severity (severity)}
        <TextInput {severity} placeholder={severity || "default"} {...args} />
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
        <TextInput {density} placeholder={density} {...args} />
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
				let value = $state("Hello world");
			</script>
		-->
    <TextInput bind:value {...args} />
    <span style="margin-inline-start: 0.5rem;">Current value: {value}</span>
  {/snippet}
</Story>

<Story
  name="Invalid state"
  args={{
    required: true,
    minlength: 8,
    value: "",
    placeholder: "Type less than 8 characters and unfocus",
    style: "width: 400px;",
  }}
/>
