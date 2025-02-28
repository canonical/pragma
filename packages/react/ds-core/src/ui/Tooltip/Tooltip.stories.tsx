import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { Button } from "../Button/index.js";
import Component from "./Tooltip.js";

const meta = {
  title: "Tooltip",
  component: Component,
  // Add padding to all tooltips to allow their entire contents to be visible
  decorators: [
    (Story) => (
      <div style={{ padding: "3rem", backgroundColor: "gray" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "Hello world",
    children: <Button label="Default" />,
  },
};

export const TopCenter: Story = {
  args: {
    message: "Hello world",
    fittedPopupProps: {
      preferredPositions: ["top"],
    },
    children: <Button label="Top Center" />,
  },
};

export const Left: Story = {
  args: {
    message: "Hello world",
    fittedPopupProps: {
      preferredPositions: ["left"],
    },
    children: <Button label="Left" />,
  },
};

export const Right: Story = {
  args: {
    message: "Hello world",
    fittedPopupProps: {
      preferredPositions: ["right"],
    },
    children: <Button label="Right" />,
  },
};

export const BottomCenter: Story = {
  args: {
    message: "Hello world",
    fittedPopupProps: {
      preferredPositions: ["bottom"],
    },
    children: <Button label="Bottom Center" />,
  },
};
//
// export const Inline: Story = {
//   render: () => (
//     <p>
//       I am a paragraph using a&nbsp;
//       <Component message={"This is a tooltip describing the word"}>
//         <span>word</span>
//       </Component>
//       &nbsp;that needs further explanation, which will be provided via a
//       tooltip.
//     </p>
//   ),
// };
