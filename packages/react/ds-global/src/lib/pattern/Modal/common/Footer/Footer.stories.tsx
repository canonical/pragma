import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../../../component/Button/index.js";
import Footer from "./Footer.js";

const meta = {
  title: "patterns/Modal/Footer",
  component: Footer,
  parameters: {
    docs: {
      description: {
        component:
          "`Modal.Footer` holds the modal's actions; the affirmative action is last and its anticipation matches the consequence. Implements `ds:global.subcomponent.modal-footer`.",
      },
    },
  },
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

/**
 * A destructive confirmation: the affirmative action carries the destructive
 * anticipation.
 */
export const Destructive: Story = {
  render: () => (
    <Footer>
      <Button importance="secondary">First action</Button>
      <Button importance="primary" anticipation="destructive">
        Second action
      </Button>
    </Footer>
  ),
};
