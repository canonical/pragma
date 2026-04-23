<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import SearchBox from "./SearchBox.svelte";

  const { Story } = defineMeta({
    title: "Components/SearchBox",
    tags: ["autodocs"],
    component: SearchBox,
    argTypes: {
      value: {
        control: { type: "text" },
        description: "The value of the search box.\n\n**@bindable**",
        table: {
          category: "properties",
          type: { summary: "string" },
        },
        defaultValue: "",
      },
      placeholder: {
        control: { type: "text" },
        description:
          "The placeholder text displayed in the search box when it is empty.",
        table: {
          category: "properties",
          type: { summary: "string" },
        },
        defaultValue: "",
      },
      onSearchButtonClick: {
        control: { disable: true },
      },
    },
    args: {
      "aria-label": "Search articles",
    },
  });
</script>

<Story name="Default" />

<Story
  name="As a search landmark"
  args={{
    "aria-label": "Articles",
    placeholder: "Ubuntu",
    required: true,
    name: "q",
  }}
>
  {#snippet template(args)}
    <search>
      <form action="/">
        <SearchBox {...args} />
        <input
          type="hidden"
          name="path"
          value="/story/components-searchbox--as-a-search-landmark"
        />
        <input
          type="hidden"
          name="args"
          value="placeholder:You+found+an+Easter+egg"
        />
      </form>
    </search>
  {/snippet}
</Story>

<Story
  name="With invalid styles"
  args={{
    invalidStyled: true,
    placeholder: "Type less than 3 characters and unfocus",
    required: true,
    minlength: 3,
  }}
/>

<Story
  name="Disabled"
  args={{
    disabled: true,
    placeholder: "Search disabled",
  }}
/>
