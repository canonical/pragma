import type { Meta, StoryObj } from "@storybook/react-vite";
import SidePanelComponent from "./SidePanel.js";

const meta = {
  title: "SidePanel",
  component: SidePanelComponent,
  decorators: [
    (Story) => (
      <>
        <div className="l-application" id="l-application" role="presentation">
          <main className="l-main" />
        </div>
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof SidePanelComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <div>Here be dragons</div>,
  },
};
