import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  lxdContentRoot,
  lxdFooterRoot,
  maasContentRoot,
  maasFooterRoot,
} from "#storybook/navigation/fixtures.js";
import {
  Brand,
  navDecorators,
  withNavigationRouterProps,
  withNavLayout,
} from "#storybook/navigation/story-utils.js";
import SideNavigation from "./SideNavigation.js";

const meta: Meta<typeof SideNavigation> = {
  title: "Components/SideNavigation",
  component: SideNavigation,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  // withNavigationRouterProps injects currentUrl + LinkComponent from the live
  // router and keys the story so active state follows navigation; withNavLayout
  // frames it in a page grid. Stories supply only data (root / footerRoot).
  // Order matters (first = outermost): the router provider (navDecorators) must
  // wrap withNavigationRouterProps, which calls useRoute(); the page layout is
  // innermost.
  decorators: [...navDecorators, withNavigationRouterProps, withNavLayout],
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
