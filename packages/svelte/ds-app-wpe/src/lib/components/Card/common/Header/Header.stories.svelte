<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Header } from "./index.js";

  const { Story } = defineMeta({
    title: "Components/Card/Header",
    component: Header,
    tags: ["autodocs"],
    argTypes: {
      children: {
        control: { disable: true },
        description: "Header content (required).",
      },
    },
    parameters: {
      docs: {
        description: {
          component:
            "Card.Header provides a header section for cards. Implements `ds:global.subcomponent.card-header`.",
        },
      },
    },
  });
</script>

<!-- Default header with content. -->
<Story name="Default" asChild>
  <div class="ds card" style="max-width: 400px; border: 1px solid #e5e5e5;">
    <Header>Card Header</Header>
  </div>
</Story>
