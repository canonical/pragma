import { Meta, StoryFn } from "@storybook/react";
import Label from "./Label.js";

const meta = {
  title: "Label",
  tags: ["autodocs"],
  component: Label,
  argTypes: {
    id: {
      description: "The id of the label",
      type: {
        name: "string",
        required: false,
      },
    },
    htmlFor: {
      description: "The id of the element that this label is associated with",
      type: {
        name: "string",
        required: false,
      },
    },
    children: {
      description: "The content of the label",
      type: {
        name: "string",
        required: false,
      },
    },
    className: {
      description: "The class name of the label",
      type: {
        name: "string",
        required: false,
      },
    },
  },
} satisfies Meta<typeof Label>;

export default meta;

const storyOptions = {
  docs: {
    source: {
      type: "code",
    },
  },
};

export const Default: StoryFn = (args) => {
  return <Label {...args}>{args.children}</Label>;
};

Default.parameters = storyOptions;
