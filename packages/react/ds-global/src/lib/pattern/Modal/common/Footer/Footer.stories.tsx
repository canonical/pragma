import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../../../component/Button/index.js";
import Footer from "./Footer.js";

const meta = {
  title: "patterns/Modal/Footer",
  component: Footer,
  argTypes: {
    children: {
      control: false,
      description: "The actions that capture the user's decision.",
    },
  },
  decorators: [
    (Story) => (
      <div
        className="ds modal"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default footer with a secondary and an affirmative action.
 */
export const Default: Story = {
  render: () => (
    <Footer>
      <Button importance="secondary">First action</Button>
      <Button importance="primary" anticipation="constructive">
        Second action
      </Button>
    </Footer>
  ),
};
