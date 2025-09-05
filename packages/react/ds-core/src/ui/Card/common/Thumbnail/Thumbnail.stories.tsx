/* @canonical/generator-ds 0.10.0-experimental.2 */

// Needed for function-based story, safe to remove otherwise
// import type { ThumbnailProps } from './types.js'
import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Thumbnail.js";

// Needed for template-based story, safe to remove otherwise
// import type { StoryFn } from '@storybook/react'

const meta = {
  title: "Card/Thumbnail",
  component: Component,
} satisfies Meta<typeof Component>;

export default meta;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://placehold.co/400",
    alt: "Placeholder image",
  },
};

/*
  Function-based story
  Direct arguments passed to the component
  Simple, but can lead to repetition if used across multiple stories with similar configurations

  export const Default = (args: ThumbnailProps) => <Component {...args} />;
  Default.args = { src: "https://via.placeholder.com/150x100", alt: "Sample thumbnail image" };
*/

/*
  Template-Based story
  Uses a template function to bind story variations, making it more reusable
  Slightly more boilerplate but more flexible for creating multiple stories with different configurations

  const Template: StoryFn<typeof Component> = (args) => <Component {...args} />;
  export const Default: StoryFn<typeof Component> = Template.bind({});
  Default.args = {
    src: "https://via.placeholder.com/150x100",
    alt: "Sample thumbnail image"
  };
*/

/*
  Static story
  Simple and straightforward, but offers the least flexibility and reusability

  export const Default: StoryFn<typeof Component> = () => (
    <Component src="https://via.placeholder.com/150x100" alt="Sample thumbnail image" />
  );
*/
