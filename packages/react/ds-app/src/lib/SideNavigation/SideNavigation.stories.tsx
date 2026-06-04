import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Brand,
  LiveSideNavigation,
  navDecorators,
} from "../../storybook/nav-story-utils.js";
import {
  lxdContentRoot,
  lxdFooterRoot,
  maasContentRoot,
  maasFooterRoot,
} from "./SideNavigation.fixtures.js";
import SideNavigation from "./SideNavigation.js";

const meta: Meta<typeof SideNavigation> = {
  title: "Components/SideNavigation",
  component: SideNavigation,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: navDecorators,
  // LiveSideNavigation reads the router location (useRoute) and feeds it as
  // currentUrl + supplies the HashLink, so the active item updates as you click.
  render: (args) => <LiveSideNavigation {...args} />,
  args: {
    brand: <Brand />,
  },
};

export default meta;
type Story = StoryObj<typeof SideNavigation>;

/** MAAS navigation: grouped hardware/KVM/organisation/config/networking. */
export const MAAS: Story = {
  args: {
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};

/** LXD navigation: project-scoped instances/profiles/networking/storage/images. */
export const LXD: Story = {
  args: {
    root: lxdContentRoot,
    footerRoot: lxdFooterRoot,
  },
};

/** Collapsed by default. */
export const Collapsed: Story = {
  args: {
    defaultExpanded: false,
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};
