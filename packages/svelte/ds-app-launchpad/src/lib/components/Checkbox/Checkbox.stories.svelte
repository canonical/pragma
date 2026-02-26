<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Checkbox from "./Checkbox.svelte";
  import type { CheckboxProps } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/Checkbox",
    tags: ["autodocs"],
    render,
    argTypes: {
      checked: {
        control: { type: "boolean" },
        description: "Whether the checkbox is checked\n\n**@bindable**",
        type: "boolean",
        defaultValue: false,
      },
      disabled: {
        control: { type: "boolean" },
        description: "Disables the checkbox, preventing user interaction",
        type: "boolean",
        defaultValue: false,
      },
      indeterminate: {
        control: { type: "boolean" },
        description:
          "Visually displays the checkbox in an indeterminate state (does not affect the actual checked value)",
        type: "boolean",
        defaultValue: false,
      },
      group: {
        control: { disable: true },
        description: `Used to control checkboxes as a group, similarly to [native Svelte bind:group](https://svelte.dev/docs/svelte/bind#input-bind:group)

**@bindable**

- Cannot coexist with \`checked\`.
- Requires \`value: T\` to be set for each checkbox in the group.
`,
        table: {
          type: { summary: `T[] where T extends HTMLInputAttributes["value"]` },
        },
      },
    },
  });

  let group = $state<string[]>([]);
</script>

{#snippet render(args: CheckboxProps)}
  <label>
    <Checkbox {...args} />
    I'm a checkbox
  </label>
{/snippet}

<!-- As an input control, it requires a `<label>` associated with it. -->
<Story name="Default" />
<Story name="Checked" args={{ checked: true }} />
<Story name="Disabled" args={{ disabled: true }} />
<Story name="Disabled checked" args={{ checked: true, disabled: true }} />
<Story name="Indeterminate" args={{ indeterminate: true }} />
<Story
  name="Indeterminate disabled"
  args={{ disabled: true, indeterminate: true }}
/>

<Story
  name="Group controlled"
  argTypes={{ checked: { table: { disable: true } } }}
>
  {#snippet template({ checked: _, ...args })}
    <!--
    <script lang="ts">
      let group = $state<string[]>([]);
    </script>
    -->

    Selected values: {group.join(", ")}

    <label>
      <Checkbox {...args} bind:group value="Option 1" />
      Option 1
    </label>
    <label>
      <Checkbox {...args} bind:group value="Option 2" />
      Option 2
    </label>
    <label>
      <Checkbox {...args} bind:group value="Option 3" />
      Option 3
    </label>
    <label>
      <Checkbox {...args} bind:group value="Option 4" />
      Option 4
    </label>
  {/snippet}
</Story>

<style>
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
