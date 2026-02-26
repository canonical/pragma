<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import Radio from "./Radio.svelte";
  import type { RadioProps } from "./types.js";

  const { Story } = defineMeta({
    title: "Components/Radio",
    tags: ["autodocs"],
    render,
    argTypes: {
      checked: {
        control: { type: "boolean" },
        description: "Whether the radio is checked",
        type: "boolean",
        defaultValue: false,
      },
      disabled: {
        control: { type: "boolean" },
        description: "Disables the radio, preventing user interaction",
        type: "boolean",
        defaultValue: false,
      },
      group: {
        control: { disable: true },
        description: `Used to control radios as a group, similarly to [native Svelte bind:group](https://svelte.dev/docs/svelte/bind#input-bind:group)

**@bindable**

- Cannot coexist with \`checked\`.
- Requires \`value: T\` to be set for each radio in the group.
`,
        table: {
          type: { summary: `T extends HTMLInputAttributes["value"]` },
        },
      },
    },
  });

  let group = $state<string>();
</script>

{#snippet render(args: RadioProps)}
  <label>
    <Radio {...args} />
    I'm a radio
  </label>
{/snippet}

<!-- As an input control, it requires a `<label>` associated with it. -->
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
      let group = $state<string>();
    </script>
    -->

    Selected value: {`${group}`}

    <label>
      <Radio {...args} bind:group value="Option 1" />
      Option 1
    </label>
    <label>
      <Radio {...args} bind:group value="Option 2" />
      Option 2
    </label>
    <label>
      <Radio {...args} bind:group value="Option 3" />
      Option 3
    </label>
    <label>
      <Radio {...args} bind:group value="Option 4" />
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
