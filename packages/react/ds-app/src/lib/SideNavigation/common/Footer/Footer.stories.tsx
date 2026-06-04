import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  HashLink,
  navDecorators,
} from "../../../../storybook/nav-story-utils.js";
import { maasFooterRoot } from "../../SideNavigation.fixtures.js";
import Footer from "./Footer.js";

const meta: Meta<typeof Footer> = {
  title: "Components/SideNavigation/Footer",
  component: Footer,
  tags: ["autodocs"],
  decorators: navDecorators,
  args: {
    LinkComponent: HashLink,
  },
};

export default meta;
type Story = StoryObj<typeof Footer>;

/** Renders the footer navigation from a WD405 root. */
export const Default: Story = {
  args: {
    root: maasFooterRoot,
    currentUrl: "/settings",
  },
};
