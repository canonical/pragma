import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HashLink,
  navDecorators,
} from "../../../../storybook/nav-story-utils.js";
import { maasContentRoot } from "../../SideNavigation.fixtures.js";
import Content from "./Content.js";

const meta: Meta<typeof Content> = {
  title: "Components/SideNavigation/Content",
  component: Content,
  tags: ["autodocs"],
  decorators: navDecorators,
  args: {
    LinkComponent: HashLink,
  },
};

export default meta;
type Story = StoryObj<typeof Content>;

/** Renders the main navigation tree from a WD405 root. */
export const Default: Story = {
  args: {
    root: maasContentRoot,
    currentUrl: "/machines",
  },
};
