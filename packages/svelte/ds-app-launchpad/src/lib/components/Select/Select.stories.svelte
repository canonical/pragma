<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { MODIFIER_FAMILIES } from "../../modifier-families/index.js";
  import Select from "./Select.svelte";

  const { Story } = defineMeta({
    title: "Components/Select",
    tags: ["autodocs"],
    component: Select,
    argTypes: {
      ref: {
        table: { disable: true },
      },
      disabled: {
        control: { type: "boolean" },
        description: "Disables the select, preventing user interaction",
        type: "boolean",
        defaultValue: false,
        table: {
          category: "properties",
        },
      },
      value: {
        description: "The value of the select.\n\n**@bindable**",
        table: {
          type: {
            detail: "is array if `multiple` is true",
            summary: "any | any[]",
          },
          category: "properties",
        },
      },
      multiple: {
        control: { type: "boolean" },
        description: "Whether the select allows multiple selections",
        type: "boolean",
        defaultValue: false,
        table: {
          category: "properties",
        },
      },
    },
  });

  let values = $state<string[]>([]);
</script>

<Story name="Default">
  {#snippet template(args)}
    <Select {...args}>
      <option value="" disabled selected>Select an option</option>
      <option value="cosmic-cuttlefish">Cosmic Cuttlefish</option>
      <option value="bionic-beaver">Bionic Beaver</option>
      <option value="xenial-xerus">Xenial Xerus</option>
    </Select>
  {/snippet}
</Story>

<Story name="Severities" argTypes={{ severity: { control: false } }}>
  {#snippet template({ children: _, severity: __, ...args })}
    <div
      style="display: grid; grid-template-columns: min-content; gap: 0.5rem;"
    >
      {#each [...MODIFIER_FAMILIES.severity, "base"] as const as severity (severity)}
        <Select {...args} {severity}>
          <option value="" disabled selected>{severity || "base"}</option>
          <option value="cosmic-cuttlefish">Cosmic Cuttlefish</option>
          <option value="bionic-beaver">Bionic Beaver</option>
          <option value="xenial-xerus">Xenial Xerus</option>
        </Select>
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Multiple options" args={{ multiple: true }}>
  <!-- 
    <script lang="ts">
      let values = $state<string[]>([]);
    </script>
  -->
  {#snippet template(args)}
    <div class="row">
      <label for="multiple-distros">Your favorite releases:</label>
      <Select bind:value={values} id="multiple-distros" {...args}>
        <option value="cosmic-cuttlefish">Cosmic Cuttlefish</option>
        <option value="bionic-beaver">Bionic Beaver</option>
        <option value="xenial-xerus">Xenial Xerus</option>
        <option value="focal-fossa">Focal Fossa</option>
        <option value="jammy-jellyfish">Jammy Jellyfish</option>
      </Select>
    </div>
    <div>Current value: <code>{JSON.stringify(values)}</code></div>
  {/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
  {#snippet template(args)}
    <Select {...args}>
      <option value="" disabled selected>Select an option</option>
      <option value="cosmic-cuttlefish">Cosmic Cuttlefish</option>
    </Select>
  {/snippet}
</Story>

<Story name="Invalid" args={{ "aria-invalid": true }}>
  {#snippet template(args)}
    <Select {...args}>
      <option value="" disabled selected>Select an option</option>
      <option value="cosmic-cuttlefish">Cosmic Cuttlefish</option>
    </Select>
  {/snippet}
</Story>

<Story name="With group options">
  {#snippet template(args)}
    <Select {...args}>
      <option value="" disabled selected>Select an option</option>
      <optgroup label="Ubuntu Linux">
        <option value="cosmic-cuttlefish">Cosmic Cuttlefish</option>
        <option value="bionic-beaver">Bionic Beaver</option>
        <option value="xenial-xerus">Xenial Xerus</option>
      </optgroup>
      <optgroup label="Windows">
        <option value="windows-10">Windows 10</option>
        <option value="windows-11">Windows 11</option>
      </optgroup>
    </Select>
  {/snippet}
</Story>
