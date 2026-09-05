import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  lxdContentRoot,
  lxdFooterRoot,
  maasContentRoot,
  maasFooterRoot,
} from "../../storybook/navigation/fixtures.js";
import {
  CanonicalLogo,
  navDecorators,
  withNavigationRouterProps,
  withNavLayout,
} from "../../storybook/navigation/story-utils.js";
import SideNavigation from "./SideNavigation.js";

const meta: Meta<typeof SideNavigation> = {
  title: "Components/SideNavigation",
  component: SideNavigation,
  parameters: { layout: "fullscreen" },
  // withNavigationRouterProps injects currentUrl + LinkComponent from the live
  // router and keys the story so active state follows navigation; withNavLayout
  // frames it in a page grid. Stories supply only data (root / footerRoot).
  // withNavigationRouterProps is self-contained (owns its RouterProvider), so
  // decorator order isn't load-bearing here; navDecorators supplies the base
  // surface and withNavLayout the page grid.
  decorators: [...navDecorators, withNavigationRouterProps, withNavLayout],
  args: {
    brand: <CanonicalLogo />,
    applicationName: "Canonical",
  },
};

export default meta;
type Story = StoryObj<typeof SideNavigation>;

/** MAAS navigation: grouped hardware/KVM/organisation/config/networking. */
export const MAAS: Story = {
  args: {
    applicationName: "MAAS",
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};

/** LXD navigation: project-scoped instances/profiles/networking/storage/images. */
export const LXD: Story = {
  args: {
    applicationName: "LXD",
    root: lxdContentRoot,
    footerRoot: lxdFooterRoot,
  },
};

/** Collapsed by default. */
export const Collapsed: Story = {
  args: {
    defaultExpanded: false,
    applicationName: "MAAS",
    root: maasContentRoot,
    footerRoot: maasFooterRoot,
  },
};

/**
 * A certificate-user app (spec's own example: "If the application allows
 * for a certificate user (like LXD)"): the closed `footerItems` vocabulary,
 * `account`'s icon becomes `certificate`, and `logout` is dropped entirely.
 */
export const CertificateUser: Story = {
  args: {
    applicationName: "LXD",
    root: lxdContentRoot,
    footerItems: [
      { kind: "account", url: "/ui/settings/account", label: "admin" },
      { kind: "logout" },
    ],
    certificateUser: true,
  },
};
