<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Switch from "./Switch.svelte";
  import type { SwitchProps } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/Switch",
    tags: ["autodocs"],
    component: Switch,
    render,
    argTypes: {
      checked: {
        control: { type: "boolean" },
        description: "Whether the switch is on or off\n\n**@bindable**",
        type: "boolean",
      },
      disabled: {
        control: { type: "boolean" },
        description: "Disables the switch, preventing user interaction",
        type: "boolean",
      },
      group: {
        control: { disable: true },
        description: `Used to control switches as a group, similarly to [native Svelte bind:group](https://svelte.dev/docs/svelte/bind#input-bind:group) for checkbox inputs

**@bindable**

- Cannot coexist with \`checked\`.
- Requires \`value: T\` to be set for each switch in the group.
`,
        table: {
          type: { summary: `T[] where T extends HTMLInputAttributes["value"]` },
        },
      },
      value: { table: { disable: true } },
    },
  });

  let group = $state<string[]>([]);
</script>

<!-- As an input control, it requires a `<label>` associated with it. -->
{#snippet render(args: SwitchProps)}
  <label>
    <Switch {...args} />
    Toggle me
  </label>
{/snippet}

<Story name="Default" />
<Story name="Checked" args={{ checked: true }} />
<Story name="Disabled" args={{ disabled: true }} />
<Story name="Disabled checked" args={{ checked: true, disabled: true }} />

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

    Enabled switches: {group.join(", ")}

    <label>
      <Switch {...args} bind:group value="Option 1" />
      Option 1
    </label>
    <label>
      <Switch {...args} bind:group value="Option 2" />
      Option 2
    </label>
    <label>
      <Switch {...args} bind:group value="Option 3" />
      Option 3
    </label>
    <label>
      <Switch {...args} bind:group value="Option 4" />
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
