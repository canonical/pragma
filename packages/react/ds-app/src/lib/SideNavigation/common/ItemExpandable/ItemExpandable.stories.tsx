import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HashLink,
  withSideNavShell,
} from "../../../../storybook/navigation/story-utils.js";
import Item from "../Item/Item.js";
import ItemExpandable from "./ItemExpandable.js";

const meta: Meta<typeof ItemExpandable> = {
  title: "Components/SideNavigation/ItemExpandable",
  component: ItemExpandable,
  parameters: { layout: "fullscreen" },
  decorators: [
    withSideNavShell,
    (Story) => (
      <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Story />
      </ul>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ItemExpandable>;

/** Closed by default — activate the summary to reveal its children. */
export const Closed: Story = {
  args: {
    label: "Hardware",
    icon: "machines",
    children: (
      <>
        <Item url="/machines" label="Machines" LinkComponent={HashLink} />
        <Item url="/devices" label="Devices" LinkComponent={HashLink} />
      </>
    ),
  },
};

/** Expanded — its (always-leaf) children are visible. */
export const Expanded: Story = {
  args: {
    ...Closed.args,
    defaultExpanded: true,
  },
};

/** Disabled — the disclosure does not respond to activation. */
export const Disabled: Story = {
  args: {
    ...Closed.args,
    disabled: true,
  },
};
