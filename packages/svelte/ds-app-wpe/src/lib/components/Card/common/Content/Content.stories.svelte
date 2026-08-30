<script lang="ts" module>
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { Content } from "./index.js";

  const { Story } = defineMeta({
    title: "Components/Card/Content",
    component: Content,
    tags: ["autodocs"],
    argTypes: {
      children: {
        control: { disable: true },
        description: "Content to display in the content area",
      },
      class: {
        control: { type: "text" },
        description: "Additional CSS classes",
      },
    },
    parameters: {
      controls: { include: ["children", "class"] },
      docs: {
        description: {
          component:
            "`Card.Content` is the main content area within a Card, providing the default slot for card content.",
        },
      },
    },
  });
</script>

<Story name="Default">
  <h4>Card content</h4>
  <p>This is the main content area of the card.</p>
  <ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
  </ul>
</Story>
