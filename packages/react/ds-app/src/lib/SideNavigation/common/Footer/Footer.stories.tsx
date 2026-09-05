import type { Meta, StoryObj } from "@storybook/react-vite";
import { maasFooterRoot } from "../../../../storybook/navigation/fixtures.js";
import {
  navDecorators,
  withNavigationRouterProps,
  withSideNavShell,
} from "../../../../storybook/navigation/story-utils.js";
import Footer from "./Footer.js";

const meta: Meta<typeof Footer> = {
  title: "Components/SideNavigation/Footer",
  component: Footer,
  // Render flush to the canvas origin (no Storybook padding) so the baseline
  // overlay grid aligns to the component's own box.
  parameters: { layout: "fullscreen" },
  // withNavigationRouterProps is self-contained (owns its RouterProvider), so
  // decorator order isn't load-bearing here. withSideNavShell provides the
  // .ds.side-navigation context so shared tokens resolve in isolation.
  decorators: [...navDecorators, withNavigationRouterProps, withSideNavShell],
};

export default meta;
type Story = StoryObj<typeof Footer>;

/** Renders the footer navigation from a WD405 root (the free-form escape hatch). */
export const Default: Story = {
  args: {
    root: maasFooterRoot,
  },
};

/** The spec's closed footer-items vocabulary: account, notifications, log out. */
export const ClosedVocabulary: Story = {
  args: {
    items: [
      { kind: "account", url: "/account", label: "Ada Lovelace" },
      {
        kind: "notifications",
        url: "/notifications",
        slot: <span>3</span>,
      },
      { kind: "logout", onClick: () => {} },
    ],
  },
};

/** A certificate user (e.g. LXD): the account icon becomes `certificate`, logout is hidden. */
export const CertificateUser: Story = {
  args: {
    ...ClosedVocabulary.args,
    certificateUser: true,
  },
};
